import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";
export const customerSchemas = {
  list: paginationInput.extend({
    cursor: z.string().optional(),
    search: z.string().trim().max(120).optional(),
  }),
  get: z.object({ id: z.string().min(1) }),
  orders: paginationInput.extend({
    customerId: z.string().min(1),
    cursor: z.uuid().optional(),
  }),
};
export type CustomerListInput = z.infer<typeof customerSchemas.list>;
export type CustomerOrdersInput = z.infer<typeof customerSchemas.orders>;
