import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "@/orpc/audit";
import { inventoryRepository } from "./PrismaInventoryRepository";
import type {
  AdjustInput,
  ExportMovementsInput,
  InventoryListInput,
  MovementListInput,
} from "./schema";

function csvCell(value: string): string {
  const safe = /^[=+@\t\r-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export class InventoryService {
  list(input: InventoryListInput) {
    return inventoryRepository.list(input);
  }
  movements(input: MovementListInput) {
    if (input.from && input.to && Date.parse(input.from) > Date.parse(input.to))
      throw new AdminError(
        "BAD_REQUEST",
        "Start date must be before end date.",
      );
    return inventoryRepository.movements(input);
  }
  async exportMovements(input: ExportMovementsInput) {
    let cursor: string | undefined;
    const lines = ["Date,SKU,Product,Variant,Reason,Change,On hand after,Note"];
    do {
      const page = await this.movements({ ...input, limit: 100, cursor });
      for (const item of page.items) {
        lines.push(
          [
            csvCell(item.createdAt.toISOString()),
            csvCell(item.variant.sku),
            csvCell(item.variant.product.name),
            csvCell(item.variant.name),
            csvCell(item.reason),
            item.quantityDelta.toString(),
            item.quantityAfter.toString(),
            csvCell(item.note ?? ""),
          ].join(","),
        );
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return {
      fileName: "inventory-movements.csv",
      content: `${lines.join("\r\n")}\r\n`,
    };
  }
  adjust(input: AdjustInput, actor: AdminActor) {
    return inventoryRepository.adjust(input, actor);
  }
}
export const inventoryService = new InventoryService();
