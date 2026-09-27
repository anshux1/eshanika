import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  AdminMembershipStatus,
  AdminRole,
} from "@eshanika/database/enums";
import {
  createAdminInvitationUrl,
  sendAdminInvitationEmail,
} from "@eshanika/email/send-admin-invitation-email";
import { toPage } from "@eshanika/orpc/pagination";
import { hashPassword } from "better-auth/crypto";
import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "@/orpc/audit";
import {
  type InvitationRecord,
  type InvitationState,
  type MemberRecord,
  PrismaTeamRepository,
} from "./PrismaTeamRepository";
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
  ListInvitationsInput,
  ListMembersInput,
  UpdateMemberInput,
} from "./schema";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type Membership = { role: AdminRole; status: AdminMembershipStatus };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

function invitationStatus(invitation: InvitationState, now: Date) {
  if (invitation.revokedAt) return "revoked" as const;
  if (invitation.acceptedAt) return "used" as const;
  if (invitation.expiresAt <= now) return "expired" as const;
  return "valid" as const;
}

function assertInvitationOpen(invitation: InvitationState, now: Date): void {
  const status = invitationStatus(invitation, now);
  if (status === "expired") {
    throw new AdminError("CONFLICT", "This invitation has expired.");
  }
  if (status === "revoked") {
    throw new AdminError("CONFLICT", "This invitation was revoked.");
  }
  if (status === "used") {
    throw new AdminError("CONFLICT", "This invitation has already been used.");
  }
}

function assertInvitationPending(invitation: InvitationRecord | null) {
  if (!invitation) {
    throw new AdminError("NOT_FOUND", "Invitation not found.");
  }
  if (invitation.acceptedAt) {
    throw new AdminError("CONFLICT", "This invitation was already accepted.");
  }
  if (invitation.revokedAt) {
    throw new AdminError("CONFLICT", "This invitation was already revoked.");
  }
  return invitation;
}

// Serializable transactions make the count stay true until commit, so two
// owners cannot demote each other at the same time.
async function assertOwnerRemains(
  repository: PrismaTeamRepository,
  current: Membership,
  next: Membership,
): Promise<void> {
  const losesOwnerAccess =
    current.role === "owner" &&
    current.status === "active" &&
    (next.role !== "owner" || next.status !== "active");
  if (!losesOwnerAccess) return;

  if ((await repository.countActiveOwners()) <= 1) {
    throw new AdminError("CONFLICT", "At least one active owner must remain.");
  }
}

function toInvitation(invitation: InvitationRecord) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    invitedBy: invitation.invitedBy,
    acceptedBy: invitation.acceptedBy,
  };
}

function toMember(member: MemberRecord) {
  return {
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

export class TeamService {
  constructor(private readonly repository: PrismaTeamRepository) {}

  async listMembers(input: ListMembersInput) {
    const rows = await this.repository.listMembers(input);
    const page = toPage(rows, input.limit, (row) => row.userId);
    return { ...page, items: page.items.map(toMember) };
  }

  updateMember(input: UpdateMemberInput, actor: AdminActor) {
    return this.repository.transaction(
      async (repository) => {
        const current = await repository.findMember(input.userId);
        if (current?.user.role !== "admin") {
          throw new AdminError("NOT_FOUND", "Admin member not found.");
        }

        const next = {
          role: input.role ?? current.role,
          status: input.status ?? current.status,
        };
        if (next.role === current.role && next.status === current.status) {
          return toMember(current);
        }
        await assertOwnerRemains(repository, current, next);

        const updated = await repository.updateMember(
          current.userId,
          next.role,
          next.status,
        );
        await repository.writeAudit(actor, {
          action: "team.member.updated",
          entityType: "AdminMembership",
          entityId: current.userId,
          beforeData: { role: current.role, status: current.status },
          afterData: { role: updated.role, status: updated.status },
        });
        return toMember(updated);
      },
      { isolationLevel: "Serializable" },
    );
  }

  async listInvitations(input: ListInvitationsInput) {
    const rows = await this.repository.listInvitations(input);
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: page.items.map(toInvitation) };
  }

  async inspectInvitation(token: string) {
    const invitation = await this.repository.findInvitationByTokenHash(
      hashToken(token),
    );
    if (!invitation) return { status: "invalid" as const };

    const status = invitationStatus(invitation, new Date());
    if (status !== "valid") return { status };
    return {
      status,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async createInvitation(input: CreateInvitationInput, actor: AdminActor) {
    const { token, tokenHash } = createToken();
    const now = new Date();

    const invitation = await this.repository.transaction(async (repository) => {
      const existingUser = await repository.findUserByEmail(input.email);
      if (existingUser?.role === "admin" || existingUser?.adminMembership) {
        throw new AdminError(
          "CONFLICT",
          "This email already has admin access.",
        );
      }
      if (await repository.hasOpenInvitation(input.email, now)) {
        throw new AdminError(
          "CONFLICT",
          "An active invitation already exists for this email.",
        );
      }

      const created = await repository.createInvitation({
        tokenHash,
        email: input.email,
        role: input.role,
        invitedByUserId: actor.userId,
        expiresAt: new Date(now.getTime() + INVITATION_LIFETIME_MS),
      });
      await repository.writeAudit(actor, {
        action: "team.invitation.created",
        entityType: "AdminInvitation",
        entityId: created.id,
        afterData: {
          role: created.role,
          expiresAt: created.expiresAt.toISOString(),
        },
      });
      return created;
    });

    return this.deliverInvitation(invitation, token, actor.requestId);
  }

  revokeInvitation(id: string, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertInvitationPending(
        await repository.findInvitation(id),
      );
      const revokedAt = new Date();
      if (!(await repository.revokeInvitation(id, revokedAt))) {
        throw new AdminError(
          "CONFLICT",
          "This invitation changed. Refresh and try again.",
        );
      }
      await repository.writeAudit(actor, {
        action: "team.invitation.revoked",
        entityType: "AdminInvitation",
        entityId: id,
        beforeData: { expiresAt: current.expiresAt.toISOString() },
        afterData: { revokedAt: revokedAt.toISOString() },
      });
      return { id, revokedAt: revokedAt.toISOString() };
    });
  }

  async resendInvitation(id: string, actor: AdminActor) {
    const { token, tokenHash } = createToken();
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS);

    const invitation = await this.repository.transaction(async (repository) => {
      const current = assertInvitationPending(
        await repository.findInvitation(id),
      );
      if (!(await repository.renewInvitation(id, tokenHash, expiresAt))) {
        throw new AdminError(
          "CONFLICT",
          "This invitation changed. Refresh and try again.",
        );
      }
      await repository.writeAudit(actor, {
        action: "team.invitation.resent",
        entityType: "AdminInvitation",
        entityId: id,
        beforeData: { expiresAt: current.expiresAt.toISOString() },
        afterData: { expiresAt: expiresAt.toISOString() },
      });
      return { ...current, expiresAt };
    });

    return this.deliverInvitation(invitation, token, actor.requestId);
  }

  async acceptInvitation(
    input: AcceptInvitationInput,
    currentUser: { id: string; email: string } | null,
    requestId: string,
  ) {
    const tokenHash = hashToken(input.token);
    const invitation =
      await this.repository.findInvitationByTokenHash(tokenHash);
    if (!invitation) {
      throw new AdminError("NOT_FOUND", "This invitation link is invalid.");
    }
    assertInvitationOpen(invitation, new Date());

    if (currentUser) {
      if (currentUser.email.toLowerCase() !== invitation.email) {
        throw new AdminError(
          "FORBIDDEN",
          "Sign in with the email address this invitation was sent to.",
        );
      }
      if (input.password) {
        throw new AdminError(
          "BAD_REQUEST",
          "Sign out to create a new account with this invitation.",
        );
      }
    } else if (!input.name || !input.password) {
      throw new AdminError(
        "BAD_REQUEST",
        "Enter your name and a password to create your account.",
      );
    }

    // Hashing is slow on purpose, so it runs before the transaction opens.
    const passwordHash = input.password
      ? await hashPassword(input.password)
      : null;

    return this.repository.transaction(
      async (repository) => {
        const user = currentUser
          ? await repository.findUserById(currentUser.id)
          : await repository.findUserByEmail(invitation.email);
        if (currentUser && !user) {
          throw new AdminError(
            "FORBIDDEN",
            "Sign in with the email address this invitation was sent to.",
          );
        }
        if (!currentUser && user) {
          throw new AdminError(
            "CONFLICT",
            "An account already uses this email. Sign in, or use Forgot password to set a password, then open this link again.",
          );
        }

        let userId: string;
        if (user) {
          userId = user.id;
          await repository.makeUserAdmin(userId);
        } else {
          if (!input.name || !passwordHash) {
            throw new AdminError(
              "BAD_REQUEST",
              "Enter your name and a password to create your account.",
            );
          }
          userId = randomUUID();
          await repository.createAdminUser({
            id: userId,
            name: input.name,
            email: invitation.email,
            passwordHash,
          });
        }

        const claimed = await repository.claimInvitation(
          invitation.id,
          tokenHash,
          new Date(),
          userId,
        );
        if (!claimed) {
          throw new AdminError(
            "CONFLICT",
            "This invitation changed. Refresh the page and try again.",
          );
        }

        const previous = user?.adminMembership ?? null;
        if (previous) {
          await assertOwnerRemains(repository, previous, {
            role: invitation.role,
            status: "active",
          });
        }
        await repository.activateMembership(userId, invitation.role);
        await repository.writeAudit(
          { userId, role: previous?.role ?? null, requestId },
          {
            action: "team.invitation.accepted",
            entityType: "AdminInvitation",
            entityId: invitation.id,
            beforeData: {
              userRole: user?.role ?? null,
              membershipRole: previous?.role ?? null,
              membershipStatus: previous?.status ?? null,
            },
            afterData: {
              userRole: "admin",
              membershipRole: invitation.role,
              membershipStatus: "active",
            },
          },
        );

        return {
          email: invitation.email,
          role: invitation.role,
          signInRequired: !currentUser,
        };
      },
      { isolationLevel: "Serializable" },
    );
  }

  // Runs after the transaction commits. A failed email must not undo the
  // invitation, because the owner can still copy the returned link.
  private async deliverInvitation(
    invitation: InvitationRecord,
    token: string,
    requestId: string,
  ) {
    const invitationUrl = createAdminInvitationUrl(token);
    let emailSent = true;
    try {
      await sendAdminInvitationEmail(invitation.email, invitationUrl);
    } catch {
      emailSent = false;
      console.error(
        `[team] invitation email delivery failed for request ${requestId}`,
      );
    }
    return { invitation: toInvitation(invitation), invitationUrl, emailSent };
  }
}

export const teamService = new TeamService(new PrismaTeamRepository());
