import { z } from "zod";

// Only the fields the admin acts on. Razorpay adds fields over time, so unknown keys are allowed.
const minor = z.int().nonnegative();
const text = z.string().nullish();

export const paymentEntity = z.object({
  id: z.string(),
  order_id: text,
  status: z.string(),
  amount: minor,
  currency: z.string(),
  method: text,
  fee: minor.nullish(),
  tax: minor.nullish(),
  error_code: text,
  error_description: text,
  error_reason: text,
  error_source: text,
  error_step: text,
  created_at: z.int(),
});

export const refundEntity = z.object({
  id: z.string(),
  payment_id: z.string(),
  amount: minor,
  currency: z.string(),
  status: z.string(),
  speed_processed: text,
  created_at: z.int(),
  receipt: text,
  // Razorpay sends an empty array instead of an object when there are no notes.
  notes: z
    .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
    .nullish(),
  acquirer_data: z.record(z.string(), z.unknown()).nullish(),
});

export const orderEntity = z.object({
  id: z.string(),
  status: z.string(),
  amount_paid: minor,
  amount_due: minor,
  attempts: z.int().nonnegative(),
});

export const webhookEnvelope = z.object({
  event: z.string().min(1).max(100),
  created_at: z.int().optional(),
  payload: z.object({
    payment: z.object({ entity: paymentEntity }).optional(),
    refund: z.object({ entity: refundEntity }).optional(),
    order: z.object({ entity: orderEntity }).optional(),
  }),
});

export type PaymentEntity = z.infer<typeof paymentEntity>;
export type RefundEntity = z.infer<typeof refundEntity>;
export type WebhookEnvelope = z.infer<typeof webhookEnvelope>;

export function noteRefundId(entity: RefundEntity) {
  const notes = entity.notes;
  if (!notes || Array.isArray(notes)) return null;
  const value = notes.refundId;
  return typeof value === "string" && z.uuid().safeParse(value).success
    ? value
    : null;
}
