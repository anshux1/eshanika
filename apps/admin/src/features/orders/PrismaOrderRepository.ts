import { db } from "@eshanika/database/db";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  OrderCancelInput,
  OrderListInput,
  OrderNoteInput,
  OrderTransitionInput,
} from "./schema";

export class PrismaOrderRepository {
  async list(input: OrderListInput) {
    const rows = await db.order.findMany({
      where: {
        status: input.status,
        paymentStatus: input.paymentStatus,
        fulfillmentStatus: input.fulfillmentStatus,
        createdAt:
          input.from || input.to
            ? {
                gte: input.from ? new Date(input.from) : undefined,
                lte: input.to ? new Date(input.to) : undefined,
              }
            : undefined,
        OR: input.search
          ? [
              { orderNumber: { contains: input.search, mode: "insensitive" } },
              { billingEmail: { contains: input.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        billingEmail: true,
        totalAmount: true,
        currencyCode: true,
        createdAt: true,
        placedAt: true,
        user: { select: { id: true, name: true } },
        _count: { select: { orderItems: true } },
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return {
      items: page.items.map((row) => ({
        ...row,
        totalAmount: row.totalAmount.toString(),
      })),
      nextCursor: page.nextCursor,
    };
  }

  async get(id: string) {
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        currencyCode: true,
        subtotalAmount: true,
        discountAmount: true,
        taxAmount: true,
        shippingAmount: true,
        totalAmount: true,
        billingEmail: true,
        customerNote: true,
        placedAt: true,
        paidAt: true,
        completedAt: true,
        cancelledAt: true,
        cancelledReason: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        orderItems: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            productId: true,
            variantId: true,
            productNameSnapshot: true,
            variantNameSnapshot: true,
            skuSnapshot: true,
            variantOptionsSnapshot: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            taxAmount: true,
            shippingAmount: true,
            totalAmount: true,
          },
        },
        orderAddresses: {
          select: {
            id: true,
            addressType: true,
            recipientName: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            landmark: true,
            city: true,
            state: true,
            postalCode: true,
            countryCode: true,
          },
        },
        orderFees: {
          select: { id: true, name: true, amount: true, taxAmount: true },
        },
        couponRedemption: {
          select: { discountAmount: true, coupon: { select: { code: true } } },
        },
        orderStatusHistories: {
          orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            source: true,
            note: true,
            occurredAt: true,
            changedByUser: { select: { id: true, name: true } },
          },
        },
        orderNotes: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            note: true,
            createdAt: true,
            authorUser: { select: { id: true, name: true } },
          },
        },
        fulfillments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            carrier: true,
            trackingNumber: true,
            trackingUrl: true,
            estimatedDeliveryAt: true,
            shippedAt: true,
            deliveredAt: true,
            failureReason: true,
            fulfillmentItems: { select: { orderItemId: true, quantity: true } },
            fulfillmentEvents: {
              orderBy: { occurredAt: "asc" },
              select: {
                id: true,
                status: true,
                source: true,
                description: true,
                location: true,
                occurredAt: true,
                createdByUser: { select: { id: true, name: true } },
              },
            },
          },
        },
        paymentOrders: {
          select: {
            id: true,
            status: true,
            payments: {
              select: {
                id: true,
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
    if (!order) return null;
    return {
      ...order,
      subtotalAmount: order.subtotalAmount.toString(),
      discountAmount: order.discountAmount.toString(),
      taxAmount: order.taxAmount.toString(),
      shippingAmount: order.shippingAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      orderItems: order.orderItems.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        discountAmount: item.discountAmount.toString(),
        taxAmount: item.taxAmount.toString(),
        shippingAmount: item.shippingAmount.toString(),
        totalAmount: item.totalAmount.toString(),
      })),
      orderFees: order.orderFees.map((fee) => ({
        ...fee,
        amount: fee.amount.toString(),
        taxAmount: fee.taxAmount.toString(),
      })),
      couponRedemption: order.couponRedemption
        ? {
            ...order.couponRedemption,
            discountAmount: order.couponRedemption.discountAmount.toString(),
          }
        : null,
      paymentOrders: order.paymentOrders.map((paymentOrder) => ({
        ...paymentOrder,
        payments: paymentOrder.payments.map((payment) => ({
          ...payment,
          amountMinor: payment.amountMinor.toString(),
          amountRefundedMinor: payment.amountRefundedMinor.toString(),
        })),
      })),
    };
  }

  async transition(input: OrderTransitionInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: input.id },
            select: { id: true, status: true, fulfillmentStatus: true },
          });
          if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
          const allowed: Record<string, string[]> = {
            created: ["confirmed"],
            confirmed: ["processing", "shipped"],
            processing: ["shipped"],
            shipped: ["out_for_delivery", "delivered", "returned"],
            out_for_delivery: ["delivered", "returned"],
            delivered: ["returned"],
          };
          if (!allowed[order.status]?.includes(input.to))
            throw new AdminError(
              "CONFLICT",
              `Order cannot move from ${order.status} to ${input.to}.`,
            );
          if (
            ["shipped", "out_for_delivery", "delivered", "returned"].includes(
              input.to,
            ) &&
            order.fulfillmentStatus !== input.to
          )
            throw new AdminError(
              "CONFLICT",
              "Move shipments first so order and fulfilment stay in sync.",
            );
          const updated = await tx.order.update({
            where: { id: input.id },
            data: {
              status: input.to,
              completedAt: input.to === "delivered" ? new Date() : undefined,
            },
            select: { id: true, status: true },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: input.id,
              fromStatus: order.status,
              toStatus: input.to,
              source: "admin",
              changedByUserId: actor.userId,
              note: input.note,
            },
          });
          await audit(tx, actor, {
            action: "orders.transition",
            entityType: "Order",
            entityId: input.id,
            beforeData: { status: order.status },
            afterData: { status: input.to },
          });
          return updated;
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async cancel(input: OrderCancelInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: input.id },
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              fulfillmentStatus: true,
              inventoryReservations: {
                where: { status: "reserved" },
                select: {
                  id: true,
                  variantId: true,
                  quantity: true,
                  quantityConsumed: true,
                },
              },
            },
          });
          if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
          if (order.status === "cancelled")
            return {
              id: order.id,
              status: order.status,
              refundNeeded: ["paid", "partially_refunded"].includes(
                order.paymentStatus,
              ),
            };
          if (!["created", "confirmed", "processing"].includes(order.status))
            throw new AdminError(
              "CONFLICT",
              "This order can no longer be cancelled.",
            );
          // Shipped parcels are already with the courier, so they come back through returns.
          if (order.fulfillmentStatus === "partially_shipped")
            throw new AdminError(
              "CONFLICT",
              "Part of this order has shipped. Handle it as a return instead.",
            );
          const reservations = [...order.inventoryReservations].sort((a, b) =>
            a.variantId.localeCompare(b.variantId),
          );
          for (const reservation of reservations) {
            const release = reservation.quantity - reservation.quantityConsumed;
            if (release <= 0) continue;
            const level = await tx.inventoryLevel.findUnique({
              where: { variantId: reservation.variantId },
              select: { quantityOnHand: true, quantityReserved: true },
            });
            if (!level || level.quantityReserved < release)
              throw new AdminError(
                "CONFLICT",
                "Inventory reservation is out of sync. Reload the order.",
              );
            const reservedAfter = level.quantityReserved - release;
            await tx.inventoryLevel.update({
              where: { variantId: reservation.variantId },
              data: { quantityReserved: reservedAfter },
            });
            await tx.inventoryReservation.update({
              where: { id: reservation.id },
              data: { status: "released", releasedAt: new Date() },
            });
            await tx.productVariant.update({
              where: { id: reservation.variantId },
              data: {
                stockStatus:
                  level.quantityOnHand - reservedAfter > 0
                    ? "in_stock"
                    : "out_of_stock",
              },
            });
            await tx.inventoryMovement.create({
              data: {
                variantId: reservation.variantId,
                idempotencyKey: `cancel:${input.idempotencyKey}:${reservation.id}`,
                quantityDelta: 0,
                quantityAfter: level.quantityOnHand,
                reason: "cancellation",
                referenceType: "Order",
                referenceId: order.id,
                actorUserId: actor.userId,
                note: `Released ${release} reserved units`,
              },
            });
          }
          await tx.order.update({
            where: { id: input.id },
            data: {
              status: "cancelled",
              cancelledAt: new Date(),
              cancelledReason: input.reason,
            },
            select: { id: true },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: input.id,
              fromStatus: order.status,
              toStatus: "cancelled",
              source: "admin",
              changedByUserId: actor.userId,
              note: input.reason,
            },
          });
          await audit(tx, actor, {
            action: "orders.cancel",
            entityType: "Order",
            entityId: input.id,
            beforeData: { status: order.status },
            afterData: {
              status: "cancelled",
              refundNeeded: ["paid", "partially_refunded"].includes(
                order.paymentStatus,
              ),
            },
          });
          return {
            id: order.id,
            status: "cancelled" as const,
            refundNeeded: ["paid", "partially_refunded"].includes(
              order.paymentStatus,
            ),
          };
        },
        { timeout: 30_000, isolationLevel: "Serializable" },
      ),
    );
  }

  async addNote(input: OrderNoteInput, actor: AdminActor) {
    return db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
      const note = await tx.orderNote.create({
        data: {
          orderId: input.id,
          note: input.note,
          authorUserId: actor.userId,
        },
        select: { id: true, note: true, createdAt: true, authorUserId: true },
      });
      await audit(tx, actor, {
        action: "orders.addNote",
        entityType: "OrderNote",
        entityId: note.id,
        afterData: { orderId: input.id },
      });
      return note;
    });
  }
}
export const orderRepository = new PrismaOrderRepository();
