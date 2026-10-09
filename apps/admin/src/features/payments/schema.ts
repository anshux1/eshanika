import { PaymentEventProcessingStatus } from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const id = z.uuid();

// Razorpay sends these as free text, so the filter accepts only the values it documents.
export const PAYMENT_STATUSES = [
  "created",
  "authorized",
  "captured",
  "refunded",
  "failed",
] as const;
export const PAYMENT_METHODS = [
  "card",
  "upi",
  "netbanking",
  "wallet",
  "emi",
  "cardless_emi",
  "paylater",
] as const;

export const paymentSchemas = {
  list: paginationInput.extend({
    cursor: id.optional(),
    status: z.enum(PAYMENT_STATUSES).optional(),
    method: z.enum(PAYMENT_METHODS).optional(),
    search: z.string().trim().max(120).optional(),
  }),
  events: paginationInput.extend({
    cursor: id.optional(),
    status: z.enum(PaymentEventProcessingStatus).optional(),
  }),
  retryEvent: z.object({ id }),
  forOrder: z.object({ orderId: id }),
  refund: z.object({
    paymentId: id,
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 499 or 499.50"),
    reason: z.string().trim().min(1).max(500),
    idempotencyKey: id,
  }),
};
export type PaymentListInput = z.infer<typeof paymentSchemas.list>;
export type PaymentEventListInput = z.infer<typeof paymentSchemas.events>;
export type RefundInput = z.infer<typeof paymentSchemas.refund>;
