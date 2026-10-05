import { db, type Prisma } from "@eshanika/database/db";
import { AdminError } from "@/lib/admin-error";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  AddFulfilmentEventInput,
  CreateFulfilmentInput,
  TransitionFulfilmentInput,
} from "./schema";

type Tx = Prisma.TransactionClient;

async function syncOrder(tx: Tx, orderId: string, actor: AdminActor) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      fulfillmentStatus: true,
      orderItems: { select: { quantity: true } },
      fulfillments: {
        select: {
          status: true,
          fulfillmentItems: { select: { quantity: true } },
        },
      },
    },
  });
  if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
  let ordered = 0;
  let shipped = 0;
  let assigned = 0;
  let allDelivered = true;
  let allReturned = true;
  let anyOut = false;
  for (const item of order.orderItems) ordered += item.quantity;
  for (const shipment of order.fulfillments) {
    if (shipment.status !== "delivered") allDelivered = false;
    if (shipment.status !== "returned") allReturned = false;
    if (shipment.status === "out_for_delivery") anyOut = true;
    for (const item of shipment.fulfillmentItems) {
      assigned += item.quantity;
      if (
        [
          "shipped",
          "out_for_delivery",
          "delivered",
          "failed",
          "returned",
        ].includes(shipment.status)
      )
        shipped += item.quantity;
    }
  }
  let fulfillmentStatus:
    | "unfulfilled"
    | "processing"
    | "partially_shipped"
    | "shipped"
    | "out_for_delivery"
    | "delivered"
    | "returned" = "unfulfilled";
  if (assigned > 0) fulfillmentStatus = "processing";
  if (shipped > 0 && shipped < ordered) fulfillmentStatus = "partially_shipped";
  if (ordered > 0 && shipped === ordered) fulfillmentStatus = "shipped";
  if (shipped === ordered && anyOut) fulfillmentStatus = "out_for_delivery";
  if (ordered > 0 && shipped === ordered && allDelivered)
    fulfillmentStatus = "delivered";
  if (ordered > 0 && shipped === ordered && allReturned)
    fulfillmentStatus = "returned";
  const status =
    fulfillmentStatus === "shipped" ||
    fulfillmentStatus === "out_for_delivery" ||
    fulfillmentStatus === "delivered" ||
    fulfillmentStatus === "returned"
      ? fulfillmentStatus
      : order.status;
  await tx.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus,
      status,
      completedAt: status === "delivered" ? new Date() : undefined,
    },
  });
  if (status !== order.status) {
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: status,
        source: "admin",
        changedByUserId: actor.userId,
      },
    });
    await audit(tx, actor, {
      action: "orders.transition",
      entityType: "Order",
      entityId: orderId,
      beforeData: { status: order.status },
      afterData: { status },
    });
  }
}

export class PrismaFulfilmentRepository {
  async create(input: CreateFulfilmentInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const existing = await tx.fulfillment.findUnique({
            where: { id: input.idempotencyKey },
            select: {
              id: true,
              orderId: true,
              carrier: true,
              trackingNumber: true,
              trackingUrl: true,
              fulfillmentItems: {
                select: { orderItemId: true, quantity: true },
              },
            },
          });
          if (existing) {
            const wanted = new Map(
              input.items.map((item) => [item.orderItemId, item.quantity]),
            );
            if (
              existing.orderId !== input.orderId ||
              existing.carrier !== input.carrier ||
              existing.trackingNumber !== (input.trackingNumber ?? null) ||
              existing.trackingUrl !== (input.trackingUrl ?? null) ||
              existing.fulfillmentItems.length !== input.items.length ||
              existing.fulfillmentItems.some(
                (item) => wanted.get(item.orderItemId) !== item.quantity,
              )
            )
              throw new AdminError(
                "CONFLICT",
                "This shipment key was already used for another shipment.",
              );
            return existing;
          }
          const order = await tx.order.findUnique({
            where: { id: input.orderId },
            select: {
              status: true,
              orderItems: { select: { id: true, quantity: true } },
              fulfillments: {
                select: {
                  fulfillmentItems: {
                    select: { orderItemId: true, quantity: true },
                  },
                },
              },
            },
          });
          if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
          if (
            ![
              "confirmed",
              "processing",
              "shipped",
              "out_for_delivery",
            ].includes(order.status)
          )
            throw new AdminError(
              "CONFLICT",
              "This order cannot receive a shipment.",
            );
          const orderedById = new Map(
            order.orderItems.map((item) => [item.id, item.quantity]),
          );
          const assignedById = new Map<string, number>();
          for (const shipment of order.fulfillments)
            for (const item of shipment.fulfillmentItems)
              assignedById.set(
                item.orderItemId,
                (assignedById.get(item.orderItemId) ?? 0) + item.quantity,
              );
          const seen = new Set<string>();
          for (const item of input.items) {
            if (seen.has(item.orderItemId))
              throw new AdminError(
                "BAD_REQUEST",
                "Choose each order item once per shipment.",
              );
            seen.add(item.orderItemId);
            const ordered = orderedById.get(item.orderItemId);
            if (ordered === undefined)
              throw new AdminError(
                "BAD_REQUEST",
                "Shipment item does not belong to the order.",
              );
            if (
              item.quantity >
              ordered - (assignedById.get(item.orderItemId) ?? 0)
            )
              throw new AdminError(
                "CONFLICT",
                "Shipment quantity exceeds the unshipped order quantity.",
              );
          }
          const shipment = await tx.fulfillment.create({
            data: {
              id: input.idempotencyKey,
              orderId: input.orderId,
              carrier: input.carrier,
              trackingNumber: input.trackingNumber,
              trackingUrl: input.trackingUrl,
              estimatedDeliveryAt: input.estimatedDeliveryAt
                ? new Date(input.estimatedDeliveryAt)
                : undefined,
              fulfillmentItems: {
                create: input.items.map((item) => ({
                  orderId: input.orderId,
                  orderItemId: item.orderItemId,
                  quantity: item.quantity,
                })),
              },
            },
            select: {
              id: true,
              orderId: true,
              status: true,
              carrier: true,
              trackingNumber: true,
              trackingUrl: true,
              fulfillmentItems: {
                select: { orderItemId: true, quantity: true },
              },
            },
          });
          await tx.fulfillmentEvent.create({
            data: {
              fulfillmentId: shipment.id,
              status: "pending",
              source: "admin",
              createdByUserId: actor.userId,
              description: "Shipment created",
            },
          });
          await syncOrder(tx, input.orderId, actor);
          await audit(tx, actor, {
            action: "fulfilments.create",
            entityType: "Fulfillment",
            entityId: shipment.id,
            afterData: { orderId: input.orderId, items: input.items },
          });
          return shipment;
        },
        { timeout: 30_000, isolationLevel: "Serializable" },
      ),
    );
  }

  async transition(input: TransitionFulfilmentInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const lookup = await tx.fulfillment.findUnique({
            where: { id: input.id },
            select: { orderId: true },
          });
          if (!lookup) throw new AdminError("NOT_FOUND", "Shipment not found.");
          const order = await tx.order.findUnique({
            where: { id: lookup.orderId },
            select: { status: true },
          });
          if (!order || order.status === "cancelled")
            throw new AdminError(
              "CONFLICT",
              "A cancelled order cannot ship or change shipment status.",
            );
          const shipment = await tx.fulfillment.findUnique({
            where: { id: input.id },
            select: {
              id: true,
              orderId: true,
              status: true,
              fulfillmentItems: {
                select: {
                  orderItemId: true,
                  quantity: true,
                  orderItem: { select: { variantId: true } },
                },
              },
            },
          });
          if (!shipment)
            throw new AdminError("NOT_FOUND", "Shipment not found.");
          if (shipment.status === input.to)
            return { id: shipment.id, status: shipment.status };
          const allowed: Record<string, string[]> = {
            pending: ["packed"],
            packed: ["shipped"],
            shipped: ["out_for_delivery", "delivered", "failed", "returned"],
            out_for_delivery: ["delivered", "failed", "returned"],
            failed: ["out_for_delivery", "delivered", "returned"],
            delivered: ["returned"],
          };
          if (!allowed[shipment.status]?.includes(input.to))
            throw new AdminError(
              "CONFLICT",
              `Shipment cannot move from ${shipment.status} to ${input.to}.`,
            );
          if (input.to === "failed" && !input.failureReason)
            throw new AdminError(
              "BAD_REQUEST",
              "Give a reason why delivery failed.",
            );
          if (input.to === "shipped") {
            const lines = [...shipment.fulfillmentItems].sort((a, b) =>
              (a.orderItem.variantId ?? "").localeCompare(
                b.orderItem.variantId ?? "",
              ),
            );
            for (const line of lines) {
              const variantId = line.orderItem.variantId;
              if (!variantId) continue;
              const variant = await tx.productVariant.findUnique({
                where: { id: variantId },
                select: { manageStock: true },
              });
              if (!variant?.manageStock) continue;
              const level = await tx.inventoryLevel.findUnique({
                where: { variantId },
                select: { quantityOnHand: true, quantityReserved: true },
              });
              if (
                !level ||
                level.quantityOnHand < line.quantity ||
                level.quantityReserved < line.quantity
              )
                throw new AdminError(
                  "CONFLICT",
                  "Inventory reservation is out of sync. Reload the order.",
                );
              const reservations = await tx.inventoryReservation.findMany({
                where: {
                  orderId: shipment.orderId,
                  orderItemId: line.orderItemId,
                  variantId,
                  status: "reserved",
                },
                orderBy: { id: "asc" },
                select: { id: true, quantity: true, quantityConsumed: true },
              });
              let remaining = line.quantity;
              for (const reservation of reservations) {
                const available =
                  reservation.quantity - reservation.quantityConsumed;
                const consumed = Math.min(remaining, available);
                if (consumed <= 0) continue;
                const quantityConsumed =
                  reservation.quantityConsumed + consumed;
                await tx.inventoryReservation.update({
                  where: { id: reservation.id },
                  data: {
                    quantityConsumed,
                    status:
                      quantityConsumed === reservation.quantity
                        ? "consumed"
                        : "reserved",
                    consumedAt:
                      quantityConsumed === reservation.quantity
                        ? new Date()
                        : undefined,
                  },
                });
                remaining -= consumed;
              }
              if (remaining > 0)
                throw new AdminError(
                  "CONFLICT",
                  "Inventory reservation is missing for a shipment item.",
                );
              const quantityOnHand = level.quantityOnHand - line.quantity;
              const quantityReserved = level.quantityReserved - line.quantity;
              await tx.inventoryLevel.update({
                where: { variantId },
                data: { quantityOnHand, quantityReserved },
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
              await tx.inventoryMovement.create({
                data: {
                  variantId,
                  idempotencyKey: `sale:${shipment.id}:${line.orderItemId}`,
                  quantityDelta: -line.quantity,
                  quantityAfter: quantityOnHand,
                  reason: "sale",
                  referenceType: "Fulfillment",
                  referenceId: shipment.id,
                  actorUserId: actor.userId,
                },
              });
            }
          }
          await tx.fulfillment.update({
            where: { id: input.id },
            data: {
              status: input.to,
              shippedAt: input.to === "shipped" ? new Date() : undefined,
              deliveredAt: input.to === "delivered" ? new Date() : undefined,
              failureReason:
                input.to === "failed" ? input.failureReason : undefined,
            },
          });
          await tx.fulfillmentEvent.create({
            data: {
              fulfillmentId: input.id,
              status: input.to,
              source: "admin",
              description: input.description,
              location: input.location,
              createdByUserId: actor.userId,
            },
          });
          await syncOrder(tx, shipment.orderId, actor);
          await audit(tx, actor, {
            action: "fulfilments.transition",
            entityType: "Fulfillment",
            entityId: input.id,
            beforeData: { status: shipment.status },
            afterData: { status: input.to },
          });
          return { id: input.id, status: input.to };
        },
        { timeout: 30_000, isolationLevel: "Serializable" },
      ),
    );
  }

  async addEvent(input: AddFulfilmentEventInput, actor: AdminActor) {
    return db.$transaction(async (tx) => {
      const shipment = await tx.fulfillment.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!shipment) throw new AdminError("NOT_FOUND", "Shipment not found.");
      const event = await tx.fulfillmentEvent.create({
        data: {
          fulfillmentId: input.id,
          status: shipment.status,
          source: "admin",
          description: input.description,
          location: input.location,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
          createdByUserId: actor.userId,
        },
        select: {
          id: true,
          status: true,
          description: true,
          location: true,
          occurredAt: true,
        },
      });
      await audit(tx, actor, {
        action: "fulfilments.addEvent",
        entityType: "FulfillmentEvent",
        entityId: event.id,
        afterData: { fulfillmentId: input.id, status: shipment.status },
      });
      return event;
    });
  }
}
export const fulfilmentRepository = new PrismaFulfilmentRepository();
