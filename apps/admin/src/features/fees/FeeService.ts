import { db, type Prisma } from "@eshanika/database/db";
import { AdminError } from "@/lib/admin-error";
import { rupeesToPaise } from "@/lib/money";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type { CodFeeUpdateInput, FeeFields } from "./schema";

const COD = "cod";

const feeSelect = {
  id: true,
  name: true,
  amount: true,
  taxable: true,
  enabled: true,
  updatedAt: true,
} satisfies Prisma.CheckoutFeeRuleSelect;

type FeeRecord = Prisma.CheckoutFeeRuleGetPayload<{ select: typeof feeSelect }>;

function toFee(fee: FeeRecord) {
  return { ...fee, amount: fee.amount.toString() };
}

function assertPositive(amount: string) {
  if (rupeesToPaise(amount) <= 0)
    throw new AdminError("BAD_REQUEST", "The fee must be more than zero.");
}

// The store has one cash-on-delivery fee rule, so this works on that single row.
export class FeeService {
  async getCod() {
    const fee = await db.checkoutFeeRule.findFirst({
      where: { paymentMethod: COD },
      orderBy: { createdAt: "asc" },
      select: feeSelect,
    });
    return fee ? toFee(fee) : null;
  }

  createCod(input: FeeFields, actor: AdminActor) {
    assertPositive(input.amount);
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const existing = await tx.checkoutFeeRule.count({
            where: { paymentMethod: COD },
          });
          if (existing > 0)
            throw new AdminError(
              "CONFLICT",
              "A cash-on-delivery fee already exists. Reload to edit it.",
            );
          // New fees start disabled so checkout totals don't change until someone turns it on.
          const fee = await tx.checkoutFeeRule.create({
            data: { ...input, paymentMethod: COD, enabled: false },
            select: feeSelect,
          });
          await audit(tx, actor, {
            action: "fees.cod.create",
            entityType: "CheckoutFeeRule",
            entityId: fee.id,
            afterData: { amount: fee.amount.toString() },
          });
          return toFee(fee);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  updateCod(input: CodFeeUpdateInput, actor: AdminActor) {
    assertPositive(input.amount);
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const current = await tx.checkoutFeeRule.findUnique({
            where: { id: input.id },
            select: { ...feeSelect, paymentMethod: true },
          });
          if (!current || current.paymentMethod !== COD)
            throw new AdminError("NOT_FOUND", "This fee was not found.");
          if (
            current.updatedAt.getTime() !==
            new Date(input.expectedUpdatedAt).getTime()
          )
            throw new AdminError(
              "CONFLICT",
              "This fee changed. Reload and try again.",
            );
          const fee = await tx.checkoutFeeRule.update({
            where: { id: input.id },
            data: {
              name: input.name,
              amount: input.amount,
              taxable: input.taxable,
              enabled: input.enabled,
            },
            select: feeSelect,
          });
          await audit(tx, actor, {
            action: "fees.cod.update",
            entityType: "CheckoutFeeRule",
            entityId: fee.id,
            beforeData: {
              amount: current.amount.toString(),
              enabled: current.enabled,
            },
            afterData: { amount: fee.amount.toString(), enabled: fee.enabled },
          });
          return toFee(fee);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }
}
export const feeService = new FeeService();
