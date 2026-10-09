import { db, type Prisma } from "@eshanika/database/db";
import type { ReturnStatus } from "@eshanika/database/enums";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  ReturnCreateInput,
  ReturnListInput,
  ReturnRestockInput,
  ReturnTransitionInput,
} from "./schema";

type Tx = Prisma.TransactionClient;

const returnSelect = {
  id: true,
  status: true,
  reason: true,
  receivedAt: true,
  createdAt: true,
  updatedAt: true,
  requestedByUser: { select: { id: true, name: true } },
  order: {
    select: {
      id: true,
      orderNumber: true,
      billingEmail: true,
      paymentStatus: true,
      user: { select: { id: true, name: true } },
    },
  },
  returnItems: {
    orderBy: { id: "asc" },
    select: {
      orderItemId: true,
      quantity: true,
      restockedQuantity: true,
      orderItem: {
        select: {
          productNameSnapshot: true,
          variantNameSnapshot: true,
          skuSnapshot: true,
          variant: { select: { manageStock: true } },
        },
      },
    },
  },
} satisfies Prisma.ReturnRequestSelect;

type ReturnRecord = Prisma.ReturnRequestGetPayload<{
  select: typeof returnSelect;
}>;

function toReturn({ returnItems, ...request }: ReturnRecord) {
  return {
    ...request,
    items: returnItems.map(({ orderItem, ...item }) => ({
      ...item,
      productName: orderItem.productNameSnapshot,
      variantName: orderItem.variantNameSnapshot,
      sku: orderItem.skuSnapshot,
      tracksStock: orderItem.variant?.manageStock ?? false,
    })),
  };
}

// Rejected and cancelled returns give their units back to the returnable pool.
const OPEN_OR_DONE: ReturnStatus[] = [
  "requested",
  "approved",
  "received",
  "completed",
];

const TRANSITIONS: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["received", "cancelled"],
  received: ["completed"],
};

async function findReturn(tx: Tx, id: string) {
  const found = await tx.returnRequest.findUnique({
    where: { id },
    select: returnSelect,
  });
  if (!found) throw new AdminError("NOT_FOUND", "Return not found.");
  return found;
}

// When every ordered unit is in a completed return, the order itself is returned.
async function syncOrderReturned(tx: Tx, orderId: string, actor: AdminActor) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      orderItems: { select: { quantity: true } },
      returnRequests: {
        where: { status: "completed" },
        select: { returnItems: { select: { quantity: true } } },
      },
    },
  });
  if (!order) return;
  if (!["shipped", "out_for_delivery", "delivered"].includes(order.status))
    return;
  let ordered = 0;
  let returned = 0;
  for (const item of order.orderItems) ordered += item.quantity;
  for (const request of order.returnRequests)
    for (const item of request.returnItems) returned += item.quantity;
  if (ordered === 0 || returned < ordered) return;
  await tx.order.update({
    where: { id: orderId },
    data: { status: "returned" },
  });
  await tx.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: order.status,
      toStatus: "returned",
      source: "admin",
      changedByUserId: actor.userId,
      note: "Every item came back through returns",
    },
  });
  await audit(tx, actor, {
    action: "orders.transition",
    entityType: "Order",
    entityId: orderId,
    beforeData: { status: order.status },
    afterData: { status: "returned" },
  });
}

export class PrismaReturnRepository {
  async list(input: ReturnListInput) {
    const rows = await db.returnRequest.findMany({
      where: {
        status: input.status,
        orderId: input.orderId,
        order: input.search
          ? {
              is: {
                OR: [
                  {
                    orderNumber: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    billingEmail: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            }
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: returnSelect,
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return { items: page.items.map(toReturn), nextCursor: page.nextCursor };
  }

  async create(input: ReturnCreateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const existing = await tx.returnRequest.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            select: { id: true, orderId: true },
          });
          if (existing) {
            if (existing.orderId !== input.orderId)
              throw new AdminError(
                "CONFLICT",
                "This return key was already used for another order.",
              );
            return toReturn(await findReturn(tx, existing.id));
          }
          const order = await tx.order.findUnique({
            where: { id: input.orderId },
            select: {
              status: true,
              orderItems: { select: { id: true } },
              fulfillments: {
                where: { status: "delivered" },
                select: {
                  fulfillmentItems: {
                    select: { orderItemId: true, quantity: true },
                  },
                },
              },
              returnRequests: {
                where: { status: { in: OPEN_OR_DONE } },
                select: {
                  returnItems: {
                    select: { orderItemId: true, quantity: true },
                  },
                },
              },
            },
          });
          if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
          if (order.status === "cancelled")
            throw new AdminError(
              "CONFLICT",
              "A cancelled order has nothing to return.",
            );
          const orderItemIds = new Set(order.orderItems.map((item) => item.id));
          const returnable = new Map<string, number>();
          for (const shipment of order.fulfillments)
            for (const item of shipment.fulfillmentItems)
              returnable.set(
                item.orderItemId,
                (returnable.get(item.orderItemId) ?? 0) + item.quantity,
              );
          for (const request of order.returnRequests)
            for (const item of request.returnItems)
              returnable.set(
                item.orderItemId,
                (returnable.get(item.orderItemId) ?? 0) - item.quantity,
              );
          for (const item of input.items) {
            if (!orderItemIds.has(item.orderItemId))
              throw new AdminError(
                "BAD_REQUEST",
                "Return item does not belong to the order.",
              );
            const left = returnable.get(item.orderItemId) ?? 0;
            if (item.quantity > left)
              throw new AdminError(
                "CONFLICT",
                left > 0
                  ? `Only ${left} delivered unit${left === 1 ? " is" : "s are"} left to return for an item.`
                  : "An item has no delivered units left to return.",
              );
          }
          const created = await tx.returnRequest.create({
            data: {
              orderId: input.orderId,
              reason: input.reason,
              idempotencyKey: input.idempotencyKey,
              requestedByUserId: actor.userId,
              returnItems: {
                create: input.items.map((item) => ({
                  orderId: input.orderId,
                  orderItemId: item.orderItemId,
                  quantity: item.quantity,
                })),
              },
            },
            select: returnSelect,
          });
          await audit(tx, actor, {
            action: "returns.create",
            entityType: "ReturnRequest",
            entityId: created.id,
            afterData: { orderId: input.orderId, items: input.items },
          });
          return toReturn(created);
        },
        { timeout: 30_000, isolationLevel: "Serializable" },
      ),
    );
  }

  async transition(input: ReturnTransitionInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const current = await findReturn(tx, input.id);
          if (current.status === input.to) return toReturn(current);
          if (!TRANSITIONS[current.status]?.includes(input.to))
            throw new AdminError(
              "CONFLICT",
              `A ${current.status} return cannot become ${input.to}.`,
            );
          await tx.returnRequest.update({
            where: { id: input.id },
            data: {
              status: input.to,
              receivedAt: input.to === "received" ? new Date() : undefined,
            },
          });
          if (input.to === "completed")
            await syncOrderReturned(tx, current.order.id, actor);
          await audit(tx, actor, {
            action: "returns.transition",
            entityType: "ReturnRequest",
            entityId: input.id,
            beforeData: { status: current.status },
            afterData: { status: input.to },
          });
          return toReturn(await findReturn(tx, input.id));
        },
        { timeout: 30_000, isolationLevel: "Serializable" },
      ),
    );
  }

  async restock(input: ReturnRestockInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const current = await findReturn(tx, input.id);
          const keys = input.items.map(
            (item) => `return:${input.idempotencyKey}:${item.orderItemId}`,
          );
          const done = await tx.inventoryMovement.count({
            where: { idempotencyKey: { in: keys } },
          });
          if (done > 0) return toReturn(current);
          if (current.status !== "received")
            throw new AdminError(
              "CONFLICT",
              "Mark the return as received before restocking it.",
            );
          const lines = await tx.returnItem.findMany({
            where: { returnRequestId: input.id },
            select: {
              id: true,
              orderItemId: true,
              quantity: true,
              restockedQuantity: true,
              orderItem: { select: { variantId: true } },
            },
          });
          const byOrderItem = new Map(
            lines.map((line) => [line.orderItemId, line]),
          );
          const work = input.items
            .map((item) => {
              const line = byOrderItem.get(item.orderItemId);
              if (!line)
                throw new AdminError(
                  "BAD_REQUEST",
                  "Restock item is not part of this return.",
                );
              const left = line.quantity - line.restockedQuantity;
              if (item.quantity > left)
                throw new AdminError(
                  "CONFLICT",
                  left > 0
                    ? `Only ${left} unit${left === 1 ? "" : "s"} of an item can still be restocked.`
                    : "An item is already fully restocked.",
                );
              const variantId = line.orderItem.variantId;
              if (!variantId)
                throw new AdminError(
                  "BAD_REQUEST",
                  "An item's product no longer exists, so it can't be restocked.",
                );
              return { line, variantId, quantity: item.quantity };
            })
            // A fixed lock order keeps two restocks from deadlocking.
            .sort((a, b) => a.variantId.localeCompare(b.variantId));
          for (const { line, variantId, quantity } of work) {
            const variant = await tx.productVariant.findUnique({
              where: { id: variantId },
              select: {
                manageStock: true,
                inventoryLevel: {
                  select: { quantityOnHand: true, quantityReserved: true },
                },
              },
            });
            if (!variant?.manageStock)
              throw new AdminError(
                "BAD_REQUEST",
                "An item doesn't track stock, so there is nothing to restock.",
              );
            const quantityOnHand =
              (variant.inventoryLevel?.quantityOnHand ?? 0) + quantity;
            const quantityReserved =
              variant.inventoryLevel?.quantityReserved ?? 0;
            await tx.inventoryLevel.upsert({
              where: { variantId },
              create: { variantId, quantityOnHand },
              update: { quantityOnHand },
            });
            await tx.productVariant.update({
              where: { id: variantId },
              data: {
                stockStatus:
                  quantityOnHand - quantityReserved > 0
                    ? "in_stock"
                    : "out_of_stock",
              },
            });
            await tx.returnItem.update({
              where: { id: line.id },
              data: { restockedQuantity: line.restockedQuantity + quantity },
            });
            await tx.inventoryMovement.create({
              data: {
                variantId,
                idempotencyKey: `return:${input.idempotencyKey}:${line.orderItemId}`,
                quantityDelta: quantity,
                quantityAfter: quantityOnHand,
                reason: "return",
                referenceType: "ReturnRequest",
                referenceId: input.id,
                actorUserId: actor.userId,
              },
            });
          }
          await audit(tx, actor, {
            action: "returns.restock",
            entityType: "ReturnRequest",
            entityId: input.id,
            afterData: { items: input.items },
          });
          return toReturn(await findReturn(tx, input.id));
        },
        { timeout: 30_000, isolationLevel: "Serializable" },
      ),
    );
  }
}
export const returnRepository = new PrismaReturnRepository();
