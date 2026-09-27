import { AdminMembershipStatus, AdminRole } from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

export const listMembersSchema = paginationInput.extend({
  cursor: z.string().min(1).max(128).optional(),
  status: z.enum(AdminMembershipStatus).optional(),
});

export const updateMemberSchema = z
  .object({
    userId: z.string().min(1).max(128),
    role: z.enum(AdminRole).optional(),
    status: z.enum(AdminMembershipStatus).optional(),
  })
  .refine((input) => input.role !== undefined || input.status !== undefined, {
    message: "Choose a role or membership status to update",
  });

export const listInvitationsSchema = paginationInput.extend({
  cursor: z.uuid().optional(),
});

const invitationTokenSchema = z
  .string()
  .length(43)
  .regex(/^[A-Za-z0-9_-]+$/, "This invitation link is invalid");

export const inspectInvitationSchema = z.object({
  token: invitationTokenSchema,
});

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  role: z.enum(AdminRole),
});

export const invitationIdSchema = z.object({ id: z.uuid() });

export const acceptInvitationSchema = z
  .object({
    token: invitationTokenSchema,
    name: z.string().trim().min(1).max(100).optional(),
    password: z.string().min(12).max(128).optional(),
  })
  .refine((input) => Boolean(input.name) === Boolean(input.password), {
    message: "Enter your name and a password to create your account",
  });

export type ListMembersInput = z.infer<typeof listMembersSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
