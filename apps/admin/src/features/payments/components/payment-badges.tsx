import type {
  PaymentEventProcessingStatus,
  RefundStatus,
} from "@eshanika/database/enums";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";
import { formatInr, paiseToRupees } from "@/lib/money";

type Badge = { tone: StatusTone; label: string };

// Razorpay payment states arrive as text, so unknown ones still render.
export const PAYMENT_ATTEMPT_STATUS: Record<string, Badge> = {
  created: { tone: "neutral", label: "Created" },
  authorized: { tone: "info", label: "Authorised" },
  captured: { tone: "success", label: "Captured" },
  refunded: { tone: "muted", label: "Refunded" },
  failed: { tone: "danger", label: "Failed" },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Card",
  upi: "UPI",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  cardless_emi: "Cardless EMI",
  paylater: "Pay later",
};

const REFUND_STATUS: Record<RefundStatus, Badge> = {
  pending: { tone: "warning", label: "Refund pending" },
  processed: { tone: "success", label: "Refunded" },
  failed: { tone: "danger", label: "Refund failed" },
};

export const EVENT_STATUS: Record<PaymentEventProcessingStatus, Badge> = {
  pending: { tone: "warning", label: "Pending" },
  processed: { tone: "success", label: "Processed" },
  failed: { tone: "danger", label: "Failed" },
  ignored: { tone: "muted", label: "Ignored" },
};

export function formatPaise(amountMinor: string) {
  return formatInr(paiseToRupees(Number(amountMinor)));
}

export function PaymentAttemptBadge({ status }: { status: string }) {
  const badge = PAYMENT_ATTEMPT_STATUS[status] ?? {
    tone: "neutral",
    label: status.replaceAll("_", " "),
  };
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const badge = REFUND_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

export function EventStatusBadge({
  status,
}: {
  status: PaymentEventProcessingStatus;
}) {
  const badge = EVENT_STATUS[status];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}
