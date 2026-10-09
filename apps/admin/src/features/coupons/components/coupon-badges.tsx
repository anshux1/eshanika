import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";
import { formatInr } from "@/lib/money";
import type { RouterOutputs } from "@/orpc/types";

export type Coupon = RouterOutputs["coupons"]["get"];
type CouponState = "active" | "scheduled" | "expired" | "archived";

const STATE: Record<CouponState, { tone: StatusTone; label: string }> = {
  active: { tone: "success", label: "Active" },
  scheduled: { tone: "info", label: "Scheduled" },
  expired: { tone: "muted", label: "Expired" },
  archived: { tone: "muted", label: "Archived" },
};

export function couponState(coupon: Coupon, now = new Date()): CouponState {
  if (coupon.archivedAt) return "archived";
  if (new Date(coupon.startsAt) > now) return "scheduled";
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return "expired";
  return "active";
}

export function discountLabel(coupon: Coupon) {
  if (coupon.kind === "fixed") return `${formatInr(coupon.value)} off`;
  const percent = `${coupon.value.replace(/\.0+$/, "")}% off`;
  return coupon.maximumDiscount
    ? `${percent}, up to ${formatInr(coupon.maximumDiscount)}`
    : percent;
}

export function CouponStateBadge({ coupon }: { coupon: Coupon }) {
  const badge = STATE[couponState(coupon)];
  const usedUp =
    coupon.usageLimit !== null && coupon.redemptionCount >= coupon.usageLimit;
  if (usedUp && !coupon.archivedAt)
    return <StatusBadge tone="muted">Used up</StatusBadge>;
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}
