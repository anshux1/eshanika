import { AdminError } from "@/lib/admin-error";
import { rupeesToPaise } from "@/lib/money";
import type { AdminActor } from "@/orpc/audit";
import { couponRepository } from "./PrismaCouponRepository";
import type {
  CouponArchiveInput,
  CouponFields,
  CouponListInput,
  CouponRedemptionListInput,
  CouponUpdateInput,
} from "./schema";

function assertValidRules(input: CouponFields) {
  const value = rupeesToPaise(input.value);
  if (input.kind === "percentage" && (value < 100 || value > 10_000))
    throw new AdminError(
      "BAD_REQUEST",
      "A percentage discount must be between 1 and 100.",
    );
  if (input.kind === "fixed" && value <= 0)
    throw new AdminError(
      "BAD_REQUEST",
      "A fixed discount must be more than zero.",
    );
  if (
    input.maximumDiscount !== null &&
    rupeesToPaise(input.maximumDiscount) <= 0
  )
    throw new AdminError(
      "BAD_REQUEST",
      "The maximum discount must be more than zero.",
    );
  if (
    input.expiresAt &&
    Date.parse(input.expiresAt) <= Date.parse(input.startsAt)
  )
    throw new AdminError(
      "BAD_REQUEST",
      "The end date must be after the start date.",
    );
}

export class CouponService {
  list(input: CouponListInput) {
    return couponRepository.list(input, new Date());
  }
  async get(id: string) {
    const coupon = await couponRepository.get(id);
    if (!coupon) throw new AdminError("NOT_FOUND", "Coupon not found.");
    return coupon;
  }
  create(input: CouponFields, actor: AdminActor) {
    assertValidRules(input);
    return couponRepository.create(input, actor);
  }
  update(input: CouponUpdateInput, actor: AdminActor) {
    assertValidRules(input);
    return couponRepository.update(input, actor);
  }
  archive(input: CouponArchiveInput, actor: AdminActor) {
    return couponRepository.archive(input, actor);
  }
  redemptions(input: CouponRedemptionListInput) {
    return couponRepository.redemptions(input);
  }
}
export const couponService = new CouponService();
