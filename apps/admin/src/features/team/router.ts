import { auth } from "@eshanika/auth/server";
import { AdminMembershipStatus, AdminRole } from "@eshanika/database/enums";
import { z } from "zod";
import { AdminError } from "@/lib/admin-error";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { adminProcedure, openProcedure } from "@/orpc/procedures";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  inspectInvitationSchema,
  invitationIdSchema,
  listInvitationsSchema,
  listMembersSchema,
  updateMemberSchema,
} from "./schema";
import { teamService } from "./TeamService";

const teamMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(AdminRole),
  status: z.enum(AdminMembershipStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const invitationSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.enum(AdminRole),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  invitedBy: z.object({ id: z.string(), name: z.string() }),
  acceptedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
});

const pageOutput = <T extends z.ZodType>(itemSchema: T) =>
  z.object({ items: z.array(itemSchema), nextCursor: z.string().nullable() });

const invitationMutationOutput = z.object({
  invitation: invitationSchema,
  invitationUrl: z.url(),
  emailSent: z.boolean(),
});

const invitationInspectionOutput = z.discriminatedUnion("status", [
  z.object({ status: z.literal("invalid") }),
  z.object({ status: z.literal("expired") }),
  z.object({ status: z.literal("revoked") }),
  z.object({ status: z.literal("used") }),
  z.object({
    status: z.literal("valid"),
    email: z.email(),
    role: z.enum(AdminRole),
    expiresAt: z.iso.datetime(),
  }),
]);

const teamWrite = adminProcedure("team.write");

// Invitation links are public, so limit guesses and password hashing per IP.
const invitationLink = openProcedure.use(async ({ context, next }) => {
  const allowed = await consumeRateLimit(
    `invitation:${clientIp(context.headers)}`,
    60_000,
    10,
  );
  if (!allowed) {
    throw new AdminError(
      "TOO_MANY_REQUESTS",
      "Too many attempts. Wait a minute and try again.",
    );
  }
  return next();
});

export const teamRouter = {
  members: {
    list: teamWrite
      .input(listMembersSchema)
      .output(pageOutput(teamMemberSchema))
      .handler(({ input }) => teamService.listMembers(input)),
    update: teamWrite
      .input(updateMemberSchema)
      .output(teamMemberSchema)
      .handler(({ input, context }) =>
        teamService.updateMember(input, context.actor),
      ),
  },
  invitations: {
    list: teamWrite
      .input(listInvitationsSchema)
      .output(pageOutput(invitationSchema))
      .handler(({ input }) => teamService.listInvitations(input)),
    create: teamWrite
      .input(createInvitationSchema)
      .output(invitationMutationOutput)
      .handler(({ input, context }) =>
        teamService.createInvitation(input, context.actor),
      ),
    revoke: teamWrite
      .input(invitationIdSchema)
      .output(z.object({ id: z.uuid(), revokedAt: z.iso.datetime() }))
      .handler(({ input, context }) =>
        teamService.revokeInvitation(input.id, context.actor),
      ),
    resend: teamWrite
      .input(invitationIdSchema)
      .output(invitationMutationOutput)
      .handler(({ input, context }) =>
        teamService.resendInvitation(input.id, context.actor),
      ),
    inspect: invitationLink
      .input(inspectInvitationSchema)
      .output(invitationInspectionOutput)
      .handler(({ input }) => teamService.inspectInvitation(input.token)),
    accept: invitationLink
      .input(acceptInvitationSchema)
      .output(
        z.object({
          email: z.email(),
          role: z.enum(AdminRole),
          signInRequired: z.boolean(),
        }),
      )
      .handler(async ({ input, context }) => {
        const session = await auth.api.getSession({
          headers: context.headers,
        });
        const currentUser = session
          ? { id: session.user.id, email: session.user.email }
          : null;
        return teamService.acceptInvitation(
          input,
          currentUser,
          context.requestId,
        );
      }),
  },
};
