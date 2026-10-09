import type { Prisma } from "@eshanika/database/db";
import type { DiscountKind } from "@eshanika/database/enums";
import { AdminError } from "@/lib/admin-error";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";

type DiscountRule = {
  kind: DiscountKind;
  value: string;
  maximumDiscount: string | null;
};

// Works in whole paise. A percentage like "12.5" becomes 1250 hundredths of a percent.
function couponDiscount(rule: DiscountRule, subtotal: string) {
  const subtotalPaise = BigInt(rupeesToPaise(subtotal));
  let discount =
    rule.kind === "percentage"
      ? (subtotalPaise * BigInt(rupeesToPaise(rule.value))) / 10_000n
      : BigInt(rupeesToPaise(rule.value));
  if (rule.maximumDiscount !== null) {
    const cap = BigInt(rupeesToPaise(rule.maximumDiscount));
    if (discount > cap) discount = cap;
  }
  if (discount > subtotalPaise) discount = subtotalPaise;
  return paiseToRupees(Number(discount));
}

// Checkout calls this inside its order transaction. Locking the coupon row
// makes concurrent checkouts wait their turn, so usage limits can't be overrun.
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  input: { code: string; userId: string; orderId: string; subtotal: string },
) {
  const code = input.code.trim().toUpperCase();
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Coupon" WHERE "code" = ${code} FOR UPDATE`;
  const couponId = locked[0]?.id;
  if (!couponId)
    throw new AdminError("BAD_REQUEST", "This coupon code doesn't exist.");
  const coupon = await tx.coupon.findUniqueOrThrow({
    where: { id: couponId },
    select: {
      kind: true,
      value: true,
      minimumSubtotal: true,
      maximumDiscount: true,
      usageLimit: true,
      perUserLimit: true,
      startsAt: true,
      expiresAt: true,
      archivedAt: true,
      couponShippingBenefit: { select: { freeShipping: true } },
    },
  });
  const now = new Date();
  if (coupon.archivedAt || coupon.startsAt > now)
    throw new AdminError("BAD_REQUEST", "This coupon isn't active.");
  if (coupon.expiresAt && coupon.expiresAt <= now)
    throw new AdminError("BAD_REQUEST", "This coupon has expired.");
  if (
    rupeesToPaise(input.subtotal) <
    rupeesToPaise(coupon.minimumSubtotal.toString())
  )
    throw new AdminError(
      "BAD_REQUEST",
      "The cart is below this coupon's minimum spend.",
    );
  if (coupon.usageLimit !== null) {
    const used = await tx.couponRedemption.count({ where: { couponId } });
    if (used >= coupon.usageLimit)
      throw new AdminError("CONFLICT", "This coupon has been fully used.");
  }
  const usedByCustomer = await tx.couponRedemption.count({
    where: { couponId, userId: input.userId },
  });
  if (usedByCustomer >= coupon.perUserLimit)
    throw new AdminError(
      "CONFLICT",
      "You've already used this coupon the maximum number of times.",
    );
  const discountAmount = couponDiscount(
    {
      kind: coupon.kind,
      value: coupon.value.toString(),
      maximumDiscount: coupon.maximumDiscount?.toString() ?? null,
    },
    input.subtotal,
  );
  await tx.couponRedemption.create({
    data: {
      couponId,
      orderId: input.orderId,
      userId: input.userId,
      discountAmount,
    },
  });
  return {
    couponId,
    discountAmount,
    freeShipping: coupon.couponShippingBenefit?.freeShipping ?? false,
  };
}
