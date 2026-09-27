import { randomUUID } from "node:crypto";
import { db, type Prisma } from "@eshanika/database/db";
import type {
  AdminMembershipStatus,
  AdminRole,
} from "@eshanika/database/enums";
import { type AdminActor, type AuditEntry, audit } from "@/orpc/audit";
import type { ListInvitationsInput, ListMembersInput } from "./schema";

const memberSelect = {
  userId: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.AdminMembershipSelect;

const invitationStateSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
} satisfies Prisma.AdminInvitationSelect;

// The list and mutation shape is the state shape plus who sent and accepted it.
const invitationSelect = {
  ...invitationStateSelect,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
  acceptedBy: { select: { id: true, name: true } },
} satisfies Prisma.AdminInvitationSelect;

const invitedUserSelect = {
  id: true,
  email: true,
  role: true,
  adminMembership: { select: { role: true, status: true } },
} satisfies Prisma.UserSelect;

export type MemberRecord = Prisma.AdminMembershipGetPayload<{
  select: typeof memberSelect;
}>;
export type InvitationRecord = Prisma.AdminInvitationGetPayload<{
  select: typeof invitationSelect;
}>;
export type InvitationState = Prisma.AdminInvitationGetPayload<{
  select: typeof invitationStateSelect;
}>;

export class PrismaTeamRepository {
  constructor(private readonly client: Prisma.TransactionClient = db) {}

  transaction<T>(
    work: (repository: PrismaTeamRepository) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    return db.$transaction((tx) => work(new PrismaTeamRepository(tx)), options);
  }

  writeAudit(actor: AdminActor, entry: AuditEntry): Promise<void> {
    return audit(this.client, actor, entry);
  }

  listMembers(input: ListMembersInput): Promise<MemberRecord[]> {
    return this.client.adminMembership.findMany({
      where: {
        user: { is: { role: "admin" } },
        ...(input.status ? { status: input.status } : {}),
      },
      select: memberSelect,
      orderBy: [{ createdAt: "desc" }, { userId: "desc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { userId: input.cursor }, skip: 1 } : {}),
    });
  }

  findMember(userId: string): Promise<MemberRecord | null> {
    return this.client.adminMembership.findUnique({
      where: { userId },
      select: memberSelect,
    });
  }

  countActiveOwners(): Promise<number> {
    return this.client.adminMembership.count({
      where: {
        role: "owner",
        status: "active",
        user: { is: { role: "admin" } },
      },
    });
  }

  updateMember(
    userId: string,
    role: AdminRole,
    status: AdminMembershipStatus,
  ): Promise<MemberRecord> {
    return this.client.adminMembership.update({
      where: { userId },
      data: { role, status },
      select: memberSelect,
    });
  }

  listInvitations(input: ListInvitationsInput): Promise<InvitationRecord[]> {
    return this.client.adminInvitation.findMany({
      select: invitationSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
  }

  findInvitation(id: string): Promise<InvitationRecord | null> {
    return this.client.adminInvitation.findUnique({
      where: { id },
      select: invitationSelect,
    });
  }

  findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<InvitationState | null> {
    return this.client.adminInvitation.findUnique({
      where: { tokenHash },
      select: invitationStateSelect,
    });
  }

  async hasOpenInvitation(email: string, now: Date): Promise<boolean> {
    const invitation = await this.client.adminInvitation.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    return invitation !== null;
  }

  findUserById(id: string) {
    return this.client.user.findUnique({
      where: { id },
      select: invitedUserSelect,
    });
  }

  findUserByEmail(email: string) {
    return this.client.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: invitedUserSelect,
    });
  }

  createInvitation(data: {
    tokenHash: string;
    email: string;
    role: AdminRole;
    invitedByUserId: string;
    expiresAt: Date;
  }): Promise<InvitationRecord> {
    return this.client.adminInvitation.create({
      data,
      select: invitationSelect,
    });
  }

  // The where clause only matches open invitations, so a concurrent accept or
  // revoke makes these return false instead of overwriting it.
  async revokeInvitation(id: string, revokedAt: Date): Promise<boolean> {
    const result = await this.client.adminInvitation.updateMany({
      where: { id, acceptedAt: null, revokedAt: null },
      data: { revokedAt },
    });
    return result.count === 1;
  }

  async renewInvitation(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const result = await this.client.adminInvitation.updateMany({
      where: { id, acceptedAt: null, revokedAt: null },
      data: { tokenHash, expiresAt },
    });
    return result.count === 1;
  }

  async claimInvitation(
    id: string,
    tokenHash: string,
    acceptedAt: Date,
    acceptedByUserId: string,
  ): Promise<boolean> {
    const result = await this.client.adminInvitation.updateMany({
      where: {
        id,
        tokenHash,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: acceptedAt },
      },
      data: { acceptedAt, acceptedByUserId },
    });
    return result.count === 1;
  }

  async createAdminUser(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<void> {
    await this.client.user.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
        emailVerified: true,
        role: "admin",
        accounts: {
          create: {
            id: randomUUID(),
            accountId: data.id,
            providerId: "credential",
            password: data.passwordHash,
          },
        },
      },
    });
  }

  async makeUserAdmin(userId: string): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { role: "admin" },
    });
  }

  async activateMembership(userId: string, role: AdminRole): Promise<void> {
    await this.client.adminMembership.upsert({
      where: { userId },
      create: { userId, role, status: "active" },
      update: { role, status: "active" },
    });
  }
}
