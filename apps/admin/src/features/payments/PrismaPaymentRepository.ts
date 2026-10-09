import { db, type Prisma } from "@eshanika/database/db";
import type {
  OrderPaymentStatus,
  RefundStatus,
} from "@eshanika/database/enums";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { formatInr, paiseToRupees } from "@/lib/money";
import type { ProviderRefund, RefundResult } from "@/lib/razorpay";
import { toProviderRefund } from "@/lib/razorpay";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  PaymentEventListInput,
  PaymentListInput,
  RefundInput,
} from "./schema";
import {
  noteRefundId,
  type PaymentEntity,
  type WebhookEnvelope,
  webhookEnvelope,
} from "./webhook-payload";

type Tx = Prisma.TransactionClient;

const PROVIDER = "razorpay";
const SERIALIZABLE = {
  timeout: 30_000,
  isolationLevel: "Serializable",
} as const;

// A later webhook can arrive first, so a payment never steps back to an earlier state.
const PAYMENT_STATUS_RANK: Record<string, number> = {
  created: 0,
  failed: 1,
  authorized: 1,
  captured: 2,
  refunded: 3,
};

const refundSelect = {
  id: true,
  status: true,
  amountMinor: true,
  reason: true,
  failureReason: true,
  providerRefundId: true,
  requestedAt: true,
  processedAt: true,
  requestedByUser: { select: { id: true, name: true } },
} satisfies Prisma.RefundSelect;

type RefundRecord = Prisma.RefundGetPayload<{ select: typeof refundSelect }>;

export function toRefund(refund: RefundRecord) {
  return { ...refund, amountMinor: refund.amountMinor.toString() };
}

function isCaptured(payment: { status: string; capturedAt: Date | null }) {
  return (
    payment.capturedAt !== null ||
    payment.status === "captured" ||
    payment.status === "refunded"
  );
}

// Pending refunds count too, so two refunds sent at once can't exceed the payment.
function refundableMinor(
  payment: { amountMinor: bigint; status: string; capturedAt: Date | null },
  refunds: { status: RefundStatus; amountMinor: bigint }[],
) {
  if (!isCaptured(payment)) return 0n;
  let committed = 0n;
  for (const refund of refunds)
    if (refund.status !== "failed") committed += refund.amountMinor;
  const left = payment.amountMinor - committed;
  return left > 0n ? left : 0n;
}

async function recomputePayment(tx: Tx, paymentId: string) {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: {
      status: true,
      amountMinor: true,
      paymentOrder: { select: { orderId: true } },
      refunds: {
        where: { status: "processed" },
        select: { amountMinor: true },
      },
    },
  });
  if (!payment) return;
  let refunded = 0n;
  for (const refund of payment.refunds) refunded += refund.amountMinor;
  const full = refunded > 0n && refunded >= payment.amountMinor;
  await tx.payment.update({
    where: { id: paymentId },
    data: {
      amountRefundedMinor: refunded,
      refundStatus: full ? "full" : refunded > 0n ? "partial" : null,
      status: full && payment.status === "captured" ? "refunded" : undefined,
    },
  });
  await recomputeOrder(tx, payment.paymentOrder.orderId);
}

async function recomputeOrder(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      paymentStatus: true,
      paidAt: true,
      paymentOrders: {
        select: {
          payments: {
            select: {
              status: true,
              amountMinor: true,
              amountRefundedMinor: true,
              capturedAt: true,
            },
          },
        },
      },
    },
  });
  if (!order) return;
  const payments = order.paymentOrders.flatMap((entry) => entry.payments);
  let captured = 0n;
  let refunded = 0n;
  for (const payment of payments) {
    if (!isCaptured(payment)) continue;
    captured += payment.amountMinor;
    refunded += payment.amountRefundedMinor;
  }
  let paymentStatus: OrderPaymentStatus = order.paymentStatus;
  if (captured > 0n)
    paymentStatus =
      refunded >= captured
        ? "refunded"
        : refunded > 0n
          ? "partially_refunded"
          : "paid";
  else if (payments.some((payment) => payment.status === "authorized"))
    paymentStatus = "authorized";
  else if (
    payments.length > 0 &&
    payments.every((payment) => payment.status === "failed")
  )
    paymentStatus = "failed";
  if (paymentStatus === order.paymentStatus && order.paidAt) return;
  await tx.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      paidAt: !order.paidAt && captured > 0n ? new Date() : undefined,
    },
  });
}

async function upsertPayment(
  tx: Tx,
  paymentOrderId: string,
  entity: PaymentEntity,
) {
  const where = {
    provider_providerPaymentId: {
      provider: PROVIDER,
      providerPaymentId: entity.id,
    },
  };
  const existing = await tx.payment.findUnique({
    where,
    select: { id: true, status: true },
  });
  const keepStatus =
    existing &&
    (PAYMENT_STATUS_RANK[existing.status] ?? 0) >
      (PAYMENT_STATUS_RANK[entity.status] ?? 0);
  const details = {
    amountMinor: BigInt(entity.amount),
    currencyCode: entity.currency,
    paymentMethod: entity.method ?? null,
    feeMinor: entity.fee == null ? null : BigInt(entity.fee),
    taxMinor: entity.tax == null ? null : BigInt(entity.tax),
    errorCode: entity.error_code ?? null,
    errorDescription: entity.error_description ?? null,
    errorReason: entity.error_reason ?? null,
    errorSource: entity.error_source ?? null,
    errorStep: entity.error_step ?? null,
    providerCreatedAt: new Date(entity.created_at * 1000),
  };
  const capturedAt = entity.status === "captured" ? new Date() : undefined;
  if (!existing) {
    return tx.payment.create({
      data: {
        ...details,
        paymentOrderId,
        provider: PROVIDER,
        providerPaymentId: entity.id,
        status: entity.status,
        capturedAt,
      },
      select: { id: true },
    });
  }
  return tx.payment.update({
    where: { id: existing.id },
    data: {
      ...details,
      status: keepStatus ? undefined : entity.status,
      capturedAt: keepStatus ? undefined : capturedAt,
    },
    select: { id: true },
  });
}

// Moves a refund forward with what Razorpay reported. A settled refund never goes back to pending.
async function settleRefund(
  tx: Tx,
  refundId: string,
  provider: ProviderRefund,
  failureReason?: string,
) {
  const refund = await tx.refund.findUnique({
    where: { id: refundId },
    select: { status: true, paymentId: true },
  });
  if (!refund) return;
  const status: RefundStatus =
    refund.status === "pending" ? provider.status : refund.status;
  await tx.refund.update({
    where: { id: refundId },
    data: {
      status,
      providerRefundId: provider.id,
      providerCreatedAt: provider.createdAt,
      speedProcessed: provider.speedProcessed ?? undefined,
      acquirerReference: provider.acquirerReference ?? undefined,
      processedAt:
        status === "processed" && refund.status !== "processed"
          ? new Date()
          : undefined,
      failureReason:
        status === "failed" && refund.status !== "failed"
          ? (failureReason ?? "Razorpay could not process the refund.")
          : undefined,
    },
  });
  if (status !== refund.status) await recomputePayment(tx, refund.paymentId);
}

type EventOutcome = {
  outcome: "processed" | "ignored";
  note?: string;
  paymentOrderId?: string;
  paymentId?: string;
};

async function applyPaymentEvent(
  tx: Tx,
  envelope: WebhookEnvelope,
): Promise<EventOutcome> {
  const entity = envelope.payload.payment?.entity;
  if (!entity) return { outcome: "ignored", note: "No payment in event." };
  if (!entity.order_id)
    return { outcome: "ignored", note: "Payment has no Razorpay order." };
  const paymentOrder = await tx.paymentOrder.findFirst({
    where: { provider: PROVIDER, providerOrderId: entity.order_id },
    select: { id: true, orderId: true, status: true },
  });
  if (!paymentOrder)
    return { outcome: "ignored", note: "No matching payment order." };
  const payment = await upsertPayment(tx, paymentOrder.id, entity);
  const orderEntity = envelope.payload.order?.entity;
  const paid = entity.status === "captured" || orderEntity?.status === "paid";
  await tx.paymentOrder.update({
    where: { id: paymentOrder.id },
    data: {
      status: paid
        ? "paid"
        : ["pending", "created"].includes(paymentOrder.status)
          ? "attempted"
          : undefined,
      providerStatus: orderEntity?.status,
      providerAmountPaidMinor:
        orderEntity === undefined ? undefined : BigInt(orderEntity.amount_paid),
      providerAmountDueMinor:
        orderEntity === undefined ? undefined : BigInt(orderEntity.amount_due),
      providerAttempts: orderEntity?.attempts,
    },
  });
  await recomputePayment(tx, payment.id);
  return {
    outcome: "processed",
    paymentOrderId: paymentOrder.id,
    paymentId: payment.id,
  };
}

async function applyRefundEvent(
  tx: Tx,
  envelope: WebhookEnvelope,
): Promise<EventOutcome> {
  const entity = envelope.payload.refund?.entity;
  if (!entity) return { outcome: "ignored", note: "No refund in event." };
  const payment = await tx.payment.findUnique({
    where: {
      provider_providerPaymentId: {
        provider: PROVIDER,
        providerPaymentId: entity.payment_id,
      },
    },
    select: { id: true, paymentOrderId: true },
  });
  if (!payment)
    return { outcome: "ignored", note: "No matching payment for refund." };
  const ourId = noteRefundId(entity);
  const known = await tx.refund.findFirst({
    where: {
      paymentId: payment.id,
      OR: [{ providerRefundId: entity.id }, ...(ourId ? [{ id: ourId }] : [])],
    },
    select: { id: true },
  });
  // Refunds made on the Razorpay dashboard still count against the payment.
  const refundId =
    known?.id ??
    (
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          provider: PROVIDER,
          providerRefundId: entity.id,
          idempotencyKey: `${PROVIDER}:${entity.id}`,
          amountMinor: BigInt(entity.amount),
          currencyCode: entity.currency,
          providerReceipt: entity.receipt ?? null,
          reason: "Issued outside the admin",
        },
        select: { id: true },
      })
    ).id;
  await settleRefund(tx, refundId, toProviderRefund(entity));
  return {
    outcome: "processed",
    paymentOrderId: payment.paymentOrderId,
    paymentId: payment.id,
  };
}

function retryDelayMs(attempt: number) {
  return Math.min(2 ** attempt * 60_000, 6 * 60 * 60_000);
}

export class PrismaPaymentRepository {
  async list(input: PaymentListInput) {
    const rows = await db.payment.findMany({
      where: {
        provider: PROVIDER,
        status: input.status,
        paymentMethod: input.method,
        OR: input.search
          ? [
              {
                providerPaymentId: {
                  contains: input.search,
                  mode: "insensitive",
                },
              },
              {
                paymentOrder: {
                  is: {
                    order: {
                      is: {
                        orderNumber: {
                          contains: input.search,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                },
              },
            ]
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        providerPaymentId: true,
        status: true,
        paymentMethod: true,
        amountMinor: true,
        amountRefundedMinor: true,
        errorDescription: true,
        capturedAt: true,
        createdAt: true,
        paymentOrder: {
          select: {
            order: {
              select: { id: true, orderNumber: true, billingEmail: true },
            },
          },
        },
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return {
      items: page.items.map(({ paymentOrder, ...payment }) => ({
        ...payment,
        amountMinor: payment.amountMinor.toString(),
        amountRefundedMinor: payment.amountRefundedMinor.toString(),
        order: paymentOrder.order,
      })),
      nextCursor: page.nextCursor,
    };
  }

  async forOrder(orderId: string) {
    const paymentOrders = await db.paymentOrder.findMany({
      where: { orderId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        status: true,
        providerOrderId: true,
        receipt: true,
        amountMinor: true,
        providerAttempts: true,
        createdAt: true,
        payments: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            providerPaymentId: true,
            status: true,
            paymentMethod: true,
            amountMinor: true,
            amountRefundedMinor: true,
            errorDescription: true,
            capturedAt: true,
            createdAt: true,
            refunds: {
              orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
              select: refundSelect,
            },
          },
        },
      },
    });
    return paymentOrders.map((paymentOrder) => ({
      ...paymentOrder,
      amountMinor: paymentOrder.amountMinor.toString(),
      payments: paymentOrder.payments.map((payment) => ({
        ...payment,
        amountMinor: payment.amountMinor.toString(),
        amountRefundedMinor: payment.amountRefundedMinor.toString(),
        refundableMinor: refundableMinor(payment, payment.refunds).toString(),
        refunds: payment.refunds.map(toRefund),
      })),
    }));
  }

  async events(input: PaymentEventListInput) {
    const rows = await db.paymentEvent.findMany({
      where: { provider: PROVIDER, processingStatus: input.status },
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      // The raw payload stays on the server.
      select: {
        id: true,
        providerEventId: true,
        eventType: true,
        providerPaymentId: true,
        processingStatus: true,
        processingError: true,
        attemptCount: true,
        receivedAt: true,
        processedAt: true,
        nextAttemptAt: true,
        paymentOrder: {
          select: { order: { select: { id: true, orderNumber: true } } },
        },
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return {
      items: page.items.map(({ paymentOrder, ...event }) => ({
        ...event,
        order: paymentOrder?.order ?? null,
      })),
      nextCursor: page.nextCursor,
    };
  }

  // Returns null when Razorpay already sent this event, so duplicates are stored once.
  async storeEvent(providerEventId: string, envelope: WebhookEnvelope) {
    const payment = envelope.payload.payment?.entity;
    const refund = envelope.payload.refund?.entity;
    try {
      return await db.paymentEvent.create({
        data: {
          provider: PROVIDER,
          providerEventId,
          eventType: envelope.event,
          providerOrderId:
            payment?.order_id ?? envelope.payload.order?.entity.id ?? null,
          providerPaymentId: payment?.id ?? refund?.payment_id ?? null,
          payload: envelope as Prisma.InputJsonObject,
          providerOccurredAt: envelope.created_at
            ? new Date(envelope.created_at * 1000)
            : null,
        },
        select: { id: true },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
        return null;
      throw error;
    }
  }

  async processEvent(id: string) {
    const event = await db.paymentEvent.findUnique({
      where: { id },
      select: {
        id: true,
        eventType: true,
        payload: true,
        processingStatus: true,
        attemptCount: true,
      },
    });
    if (!event) throw new AdminError("NOT_FOUND", "Payment event not found.");
    if (
      event.processingStatus === "processed" ||
      event.processingStatus === "ignored"
    )
      return { id, processingStatus: event.processingStatus };
    const attemptCount = event.attemptCount + 1;
    try {
      const outcome = await retryWriteConflict(() =>
        db.$transaction(async (tx) => {
          const parsed = webhookEnvelope.safeParse(event.payload);
          const result: EventOutcome = !parsed.success
            ? {
                outcome: "ignored",
                note: "Event payload has an unknown shape.",
              }
            : event.eventType.startsWith("refund.")
              ? await applyRefundEvent(tx, parsed.data)
              : event.eventType.startsWith("payment.") ||
                  event.eventType === "order.paid"
                ? await applyPaymentEvent(tx, parsed.data)
                : {
                    outcome: "ignored",
                    note: "The admin doesn't use this event.",
                  };
          await tx.paymentEvent.update({
            where: { id },
            data: {
              processingStatus: result.outcome,
              processingError: result.note ?? null,
              processedAt: new Date(),
              attemptCount,
              paymentOrderId: result.paymentOrderId,
              paymentId: result.paymentId,
            },
          });
          return result.outcome;
        }, SERIALIZABLE),
      );
      return { id, processingStatus: outcome };
    } catch (error) {
      await db.paymentEvent.update({
        where: { id },
        data: {
          processingStatus: "failed",
          processingError:
            error instanceof AdminError
              ? error.message
              : "Processing failed. Retry it, or check the server logs.",
          attemptCount,
          nextAttemptAt: new Date(Date.now() + retryDelayMs(attemptCount)),
        },
      });
      console.error("Razorpay event processing failed", { id, error });
      return { id, processingStatus: "failed" as const };
    }
  }

  async reserveRefund(
    input: RefundInput,
    amountMinor: bigint,
    actor: AdminActor,
  ) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const existing = await tx.refund.findUnique({
          where: {
            provider_idempotencyKey: {
              provider: PROVIDER,
              idempotencyKey: input.idempotencyKey,
            },
          },
          select: { ...refundSelect, paymentId: true },
        });
        if (existing) {
          if (
            existing.paymentId !== input.paymentId ||
            existing.amountMinor !== amountMinor
          )
            throw new AdminError(
              "CONFLICT",
              "This refund key was already used for another refund.",
            );
          return { refund: existing, providerPaymentId: null };
        }
        const payment = await tx.payment.findUnique({
          where: { id: input.paymentId },
          select: {
            providerPaymentId: true,
            provider: true,
            status: true,
            amountMinor: true,
            currencyCode: true,
            capturedAt: true,
            refunds: { select: { status: true, amountMinor: true } },
          },
        });
        if (!payment || payment.provider !== PROVIDER)
          throw new AdminError("NOT_FOUND", "Payment not found.");
        if (!isCaptured(payment))
          throw new AdminError(
            "CONFLICT",
            "Only captured payments can be refunded.",
          );
        const left = refundableMinor(payment, payment.refunds);
        if (amountMinor > left)
          throw new AdminError(
            "CONFLICT",
            left > 0n
              ? `You can refund at most ${formatInr(paiseToRupees(Number(left)))} on this payment.`
              : "This payment has nothing left to refund.",
          );
        const refund = await tx.refund.create({
          data: {
            paymentId: input.paymentId,
            provider: PROVIDER,
            idempotencyKey: input.idempotencyKey,
            amountMinor,
            currencyCode: payment.currencyCode,
            reason: input.reason,
            requestedByUserId: actor.userId,
          },
          select: refundSelect,
        });
        await audit(tx, actor, {
          action: "refunds.requested",
          entityType: "Refund",
          entityId: refund.id,
          afterData: {
            paymentId: input.paymentId,
            amountMinor: amountMinor.toString(),
          },
        });
        return { refund, providerPaymentId: payment.providerPaymentId };
      }, SERIALIZABLE),
    );
  }

  async recordRefundResult(
    refundId: string,
    result: RefundResult,
    actor: AdminActor,
  ) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        if (result.outcome === "accepted")
          await settleRefund(tx, refundId, result.refund);
        if (result.outcome === "rejected")
          await tx.refund.updateMany({
            where: { id: refundId, status: "pending" },
            data: { status: "failed", failureReason: result.message },
          });
        await audit(tx, actor, {
          action: "refunds.result",
          entityType: "Refund",
          entityId: refundId,
          outcome: result.outcome === "rejected" ? "failure" : "success",
          afterData: { outcome: result.outcome },
        });
        const refund = await tx.refund.findUniqueOrThrow({
          where: { id: refundId },
          select: refundSelect,
        });
        return toRefund(refund);
      }, SERIALIZABLE),
    );
  }
}
export const paymentRepository = new PrismaPaymentRepository();
