import type {
  FulfillmentStatus,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "@eshanika/database/enums";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";

type Badge = { tone: StatusTone; label: string };

export const ORDER_STATUS: Record<OrderStatus, Badge> = {
  created: { tone: "neutral", label: "New" },
  confirmed: { tone: "info", label: "Confirmed" },
  processing: { tone: "info", label: "Processing" },
  shipped: { tone: "info", label: "Shipped" },
  out_for_delivery: { tone: "info", label: "Out for delivery" },
  delivered: { tone: "success", label: "Delivered" },
  cancelled: { tone: "muted", label: "Cancelled" },
  returned: { tone: "warning", label: "Returned" },
};

export const PAYMENT_STATUS: Record<OrderPaymentStatus, Badge> = {
  pending: { tone: "warning", label: "Payment pending" },
  authorized: { tone: "info", label: "Authorised" },
  paid: { tone: "success", label: "Paid" },
  failed: { tone: "danger", label: "Payment failed" },
  partially_refunded: { tone: "warning", label: "Partly refunded" },
  refunded: { tone: "muted", label: "Refunded" },
};

export const FULFILMENT_STATUS: Record<OrderFulfillmentStatus, Badge> = {
  unfulfilled: { tone: "neutral", label: "Unfulfilled" },
  processing: { tone: "info", label: "Preparing" },
  partially_shipped: { tone: "warning", label: "Partly shipped" },
  shipped: { tone: "info", label: "Shipped" },
  out_for_delivery: { tone: "info", label: "Out for delivery" },
  delivered: { tone: "success", label: "Delivered" },
  returned: { tone: "warning", label: "Returned" },
};

export const SHIPMENT_STATUS: Record<FulfillmentStatus, Badge> = {
  pending: { tone: "neutral", label: "Pending" },
  packed: { tone: "info", label: "Packed" },
  shipped: { tone: "info", label: "Shipped" },
  out_for_delivery: { tone: "info", label: "Out for delivery" },
  delivered: { tone: "success", label: "Delivered" },
  failed: { tone: "danger", label: "Delivery failed" },
  returned: { tone: "warning", label: "Returned" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const badge = ORDER_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

export function PaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  const badge = PAYMENT_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

export function FulfilmentStatusBadge({
  status,
}: {
  status: OrderFulfillmentStatus;
}) {
  const badge = FULFILMENT_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

export function ShipmentStatusBadge({ status }: { status: FulfillmentStatus }) {
  const badge = SHIPMENT_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}
