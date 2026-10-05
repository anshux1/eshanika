import { FulfillmentStatus } from "@eshanika/database/enums";
import { z } from "zod";

const id = z.uuid();
export const fulfilmentSchemas = {
  create: z.object({
    orderId: id,
    idempotencyKey: id,
    items: z
      .array(z.object({ orderItemId: id, quantity: z.int().positive() }))
      .min(1)
      .max(100),
    carrier: z.string().trim().min(1).max(120),
    trackingNumber: z.string().trim().max(200).optional(),
    trackingUrl: z.url().max(2000).optional(),
    estimatedDeliveryAt: z.iso.datetime({ offset: true }).optional(),
  }),
  transition: z.object({
    id,
    to: z.enum(FulfillmentStatus),
    description: z.string().trim().max(1000).optional(),
    location: z.string().trim().max(200).optional(),
    failureReason: z.string().trim().max(1000).optional(),
  }),
  addEvent: z.object({
    id,
    description: z.string().trim().min(1).max(1000),
    location: z.string().trim().max(200).optional(),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
  }),
};
export type CreateFulfilmentInput = z.infer<typeof fulfilmentSchemas.create>;
export type TransitionFulfilmentInput = z.infer<
  typeof fulfilmentSchemas.transition
>;
export type AddFulfilmentEventInput = z.infer<
  typeof fulfilmentSchemas.addEvent
>;
