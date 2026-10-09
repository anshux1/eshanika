import { adminProcedure } from "@/orpc/procedures";
import { couponService } from "./CouponService";
import { couponSchemas } from "./schema";

const marketing = adminProcedure("marketing.write");

export const couponsRouter = {
  list: marketing
    .input(couponSchemas.list)
    .handler(({ input }) => couponService.list(input)),
  get: marketing
    .input(couponSchemas.get)
    .handler(({ input }) => couponService.get(input.id)),
  create: marketing
    .input(couponSchemas.create)
    .handler(({ input, context }) =>
      couponService.create(input, context.actor),
    ),
  update: marketing
    .input(couponSchemas.update)
    .handler(({ input, context }) =>
      couponService.update(input, context.actor),
    ),
  archive: marketing
    .input(couponSchemas.archive)
    .handler(({ input, context }) =>
      couponService.archive(input, context.actor),
    ),
  redemptions: marketing
    .input(couponSchemas.redemptions)
    .handler(({ input }) => couponService.redemptions(input)),
};
