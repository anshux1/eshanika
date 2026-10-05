import { adminProcedure } from "@/orpc/procedures";
import { customerService } from "./CustomerService";
import { customerSchemas } from "./schema";
export const customersRouter = {
  list: adminProcedure("orders.read")
    .input(customerSchemas.list)
    .handler(({ input }) => customerService.list(input)),
  get: adminProcedure("orders.read")
    .input(customerSchemas.get)
    .handler(({ input }) => customerService.get(input.id)),
  orders: adminProcedure("orders.read")
    .input(customerSchemas.orders)
    .handler(({ input }) => customerService.orders(input)),
};
