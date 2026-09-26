import type { Prisma } from "@eshanika/database/db";
import type { AdminAuditOutcome, AdminRole } from "@eshanika/database/enums";

type AuditEntry = {
  actorUserId: string | null;
  actorAdminRole: AdminRole | null;
  action: string;
  entityType: string;
  entityId: string;
  requestId: string;
  outcome?: AdminAuditOutcome;
  reason?: string;
  // Never pass passwords, tokens, provider payloads, or customer contact details here.
  beforeData?: Prisma.InputJsonObject;
  afterData?: Prisma.InputJsonObject;
};

// Runs inside the mutation's transaction so the audit row and the change commit or roll back together.
export async function audit(
  tx: Prisma.TransactionClient,
  { outcome = "success", ...entry }: AuditEntry,
): Promise<void> {
  await tx.adminAuditLog.create({ data: { outcome, ...entry } });
}
