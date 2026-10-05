import { adminProcedure } from "@/orpc/procedures";
import { fulfilmentService } from "./FulfilmentService";
import { fulfilmentSchemas } from "./schema";
export const fulfilmentsRouter = {
  create: adminProcedure("orders.write")
    .input(fulfilmentSchemas.create)
    .handler(({ input, context }) =>
      fulfilmentService.create(input, context.actor),
    ),
  transition: adminProcedure("orders.write")
    .input(fulfilmentSchemas.transition)
    .handler(({ input, context }) =>
      fulfilmentService.transition(input, context.actor),
    ),
  addEvent: adminProcedure("orders.write")
    .input(fulfilmentSchemas.addEvent)
    .handler(({ input, context }) =>
      fulfilmentService.addEvent(input, context.actor),
    ),
};
