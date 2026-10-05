import {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const id = z.uuid();
export const orderSchemas = {
  list: paginationInput.extend({
    cursor: id.optional(),
    search: z.string().trim().max(120).optional(),
    status: z.enum(OrderStatus).optional(),
    paymentStatus: z.enum(OrderPaymentStatus).optional(),
    fulfillmentStatus: z.enum(OrderFulfillmentStatus).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  }),
  get: z.object({ id }),
  transition: z.object({
    id,
    to: z.enum(OrderStatus),
    note: z.string().trim().max(1000).optional(),
  }),
  cancel: z.object({
    id,
    reason: z.string().trim().min(1).max(1000),
    idempotencyKey: id,
  }),
  addNote: z.object({ id, note: z.string().trim().min(1).max(5000) }),
};
export type OrderListInput = z.infer<typeof orderSchemas.list>;
export type OrderTransitionInput = z.infer<typeof orderSchemas.transition>;
export type OrderCancelInput = z.infer<typeof orderSchemas.cancel>;
export type OrderNoteInput = z.infer<typeof orderSchemas.addNote>;
