import { adminProcedure } from "@/orpc/procedures";
import { returnService } from "./ReturnService";
import { returnSchemas } from "./schema";

export const returnsRouter = {
  list: adminProcedure("orders.read")
    .input(returnSchemas.list)
    .handler(({ input }) => returnService.list(input)),
  create: adminProcedure("orders.write")
    .input(returnSchemas.create)
    .handler(({ input, context }) =>
      returnService.create(input, context.actor),
    ),
  transition: adminProcedure("orders.write")
    .input(returnSchemas.transition)
    .handler(({ input, context }) =>
      returnService.transition(input, context.actor),
    ),
  restock: adminProcedure("orders.write")
    .input(returnSchemas.restock)
    .handler(({ input, context }) =>
      returnService.restock(input, context.actor),
    ),
};
