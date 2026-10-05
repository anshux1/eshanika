import { adminProcedure } from "@/orpc/procedures";
import { orderService } from "./OrderService";
import { orderSchemas } from "./schema";
export const ordersRouter = {
  list: adminProcedure("orders.read")
    .input(orderSchemas.list)
    .handler(({ input }) => orderService.list(input)),
  get: adminProcedure("orders.read")
    .input(orderSchemas.get)
    .handler(({ input }) => orderService.get(input.id)),
  transition: adminProcedure("orders.write")
    .input(orderSchemas.transition)
    .handler(({ input, context }) =>
      orderService.transition(input, context.actor),
    ),
  cancel: adminProcedure("orders.write")
    .input(orderSchemas.cancel)
    .handler(({ input, context }) => orderService.cancel(input, context.actor)),
  addNote: adminProcedure("orders.write")
    .input(orderSchemas.addNote)
    .handler(({ input, context }) =>
      orderService.addNote(input, context.actor),
    ),
};
