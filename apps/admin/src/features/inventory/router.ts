import { adminProcedure } from "@/orpc/procedures";
import { inventoryService } from "./InventoryService";
import { inventorySchemas } from "./schema";

export const inventoryRouter = {
  list: adminProcedure("inventory.write")
    .input(inventorySchemas.list)
    .handler(({ input }) => inventoryService.list(input)),
  movements: adminProcedure("inventory.write")
    .input(inventorySchemas.movements)
    .handler(({ input }) => inventoryService.movements(input)),
  exportMovements: adminProcedure("inventory.write")
    .input(inventorySchemas.exportMovements)
    .handler(({ input }) => inventoryService.exportMovements(input)),
  adjust: adminProcedure("inventory.write")
    .input(inventorySchemas.adjust)
    .handler(({ input, context }) =>
      inventoryService.adjust(input, context.actor),
    ),
};
