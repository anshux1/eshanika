import type { Prisma } from "@eshanika/database/db";
import type { AdminAuditOutcome, AdminRole } from "@eshanika/database/enums";

// Who made a change. The role is null when a person acts before having
// admin access, such as while accepting an invitation.
export type AdminActor = {
  userId: string;
  role: AdminRole | null;
  requestId: string;
};

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId: string;
  outcome?: AdminAuditOutcome;
  reason?: string;
  // Never pass passwords, tokens, provider payloads, or customer contact details here.
  beforeData?: Prisma.InputJsonObject;
  afterData?: Prisma.InputJsonObject;
};

// Runs inside the mutation's transaction so the audit row and the change commit or roll back together.
export async function audit(
  tx: Prisma.TransactionClient,
  actor: AdminActor,
  { outcome = "success", ...entry }: AuditEntry,
): Promise<void> {
  await tx.adminAuditLog.create({
    data: {
      outcome,
      actorUserId: actor.userId,
      actorAdminRole: actor.role,
      requestId: actor.requestId,
      ...entry,
    },
  });
}
