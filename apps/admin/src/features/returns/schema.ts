import { ReturnStatus } from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const id = z.uuid();
const lines = z
  .array(z.object({ orderItemId: id, quantity: z.int().min(1).max(100_000) }))
  .min(1)
  .max(100);

export const returnSchemas = {
  list: paginationInput.extend({
    cursor: id.optional(),
    status: z.enum(ReturnStatus).optional(),
    orderId: id.optional(),
    search: z.string().trim().max(120).optional(),
  }),
  create: z.object({
    orderId: id,
    reason: z.string().trim().min(1).max(1000),
    items: lines,
    idempotencyKey: id,
  }),
  transition: z.object({
    id,
    to: z.enum(["approved", "rejected", "cancelled", "received", "completed"]),
  }),
  restock: z.object({ id, items: lines, idempotencyKey: id }),
};
export type ReturnListInput = z.infer<typeof returnSchemas.list>;
export type ReturnCreateInput = z.infer<typeof returnSchemas.create>;
export type ReturnTransitionInput = z.infer<typeof returnSchemas.transition>;
export type ReturnRestockInput = z.infer<typeof returnSchemas.restock>;
