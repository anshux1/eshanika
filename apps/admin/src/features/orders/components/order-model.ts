import type { RouterOutputs } from "@/orpc/types";

export type OrderDetail = RouterOutputs["orders"]["get"];

// Cancelling stops once a parcel is with the courier; those come back through returns.
export function canCancel(order: OrderDetail) {
  return (
    ["created", "confirmed", "processing"].includes(order.status) &&
    order.fulfillmentStatus !== "partially_shipped"
  );
}

export function refundNeeded(order: OrderDetail) {
  return (
    order.status === "cancelled" &&
    (order.paymentStatus === "paid" ||
      order.paymentStatus === "partially_refunded")
  );
}
