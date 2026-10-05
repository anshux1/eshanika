import type { InventoryMovementReason } from "@eshanika/database/enums";

export const REASON_LABELS: Record<InventoryMovementReason, string> = {
  initial_stock: "Initial stock",
  restock: "Restock",
  sale: "Sale",
  return: "Return",
  cancellation: "Cancellation",
  adjustment: "Count correction",
  damage: "Damage or loss",
};

// Sales, returns, and cancellations come only from orders, never from a manual adjustment.
export const MANUAL_REASONS = [
  "restock",
  "adjustment",
  "damage",
  "initial_stock",
] as const satisfies readonly InventoryMovementReason[];
