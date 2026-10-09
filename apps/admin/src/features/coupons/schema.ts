import { DiscountKind } from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const id = z.uuid();
const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 499 or 499.50");
const timestamp = z.iso.datetime({ offset: true });

export const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(40)
  .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, dashes, or underscores");

const couponFields = z.object({
  code: couponCode,
  kind: z.enum(DiscountKind),
  value: money,
  minimumSubtotal: money,
  maximumDiscount: money.nullable(),
  startsAt: timestamp,
  expiresAt: timestamp.nullable(),
  usageLimit: z.int().min(1).max(10_000_000).nullable(),
  perUserLimit: z.int().min(1).max(1000),
  freeShipping: z.boolean(),
});

export const COUPON_STATES = [
  "active",
  "scheduled",
  "expired",
  "archived",
] as const;

export const couponSchemas = {
  list: paginationInput.extend({
    cursor: id.optional(),
    state: z.enum(COUPON_STATES).default("active"),
    search: z.string().trim().max(40).optional(),
  }),
  get: z.object({ id }),
  create: couponFields,
  update: couponFields.extend({ id, expectedUpdatedAt: timestamp }),
  archive: z.object({ id, expectedUpdatedAt: timestamp }),
  redemptions: paginationInput.extend({ couponId: id, cursor: id.optional() }),
};
export type CouponListInput = z.infer<typeof couponSchemas.list>;
export type CouponFields = z.infer<typeof couponFields>;
export type CouponUpdateInput = z.infer<typeof couponSchemas.update>;
export type CouponArchiveInput = z.infer<typeof couponSchemas.archive>;
export type CouponRedemptionListInput = z.infer<
  typeof couponSchemas.redemptions
>;
