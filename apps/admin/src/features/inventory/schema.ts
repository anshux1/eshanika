import { InventoryMovementReason } from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

export const inventorySchemas = {
  list: paginationInput.extend({
    cursor: z.uuid().optional(),
    stock: z.enum(["all", "low", "out"]).default("all"),
  }),
  movements: paginationInput.extend({
    cursor: z.uuid().optional(),
    variantId: z.uuid().optional(),
    reason: z.enum(InventoryMovementReason).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  }),
  exportMovements: z.object({
    variantId: z.uuid().optional(),
    reason: z.enum(InventoryMovementReason).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  }),
  adjust: z.object({
    variantId: z.uuid(),
    quantityDelta: z
      .int()
      .min(-2_000_000_000)
      .max(2_000_000_000)
      .refine((n) => n !== 0),
    reason: z.enum(["restock", "adjustment", "damage", "initial_stock"]),
    note: z.string().trim().max(1000).optional(),
    idempotencyKey: z.uuid(),
  }),
};
export type InventoryListInput = z.infer<typeof inventorySchemas.list>;
export type MovementListInput = z.infer<typeof inventorySchemas.movements>;
export type ExportMovementsInput = z.infer<
  typeof inventorySchemas.exportMovements
>;
export type AdjustInput = z.infer<typeof inventorySchemas.adjust>;
