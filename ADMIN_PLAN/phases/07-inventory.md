# 07 Inventory

**Goal:** see and adjust stock through a ledger that is never edited directly.

## Build

- `/inventory`: every managed-stock variant with on hand, reserved, available (on hand minus reserved), and reorder point. Filter by low stock and out of stock.
- Adjust dialog: amount (+/-), reason (`restock`, `adjustment`, `damage`, `initial_stock`), note, and a preview of the new balance.
- `/inventory/movements`: ledger filtered by variant, reason, and date. CSV export.
- `inventory.adjust` writes an `InventoryMovement` and updates `InventoryLevel` in one serializable transaction. It retries write conflicts and uses the dialog's idempotency key.
- Keep `ProductVariant.stockStatus` in sync when available stock crosses zero.

## Rules

- On hand can never go below reserved.
- The same idempotency key sent twice creates one movement.
- `sale`, `return`, and `cancellation` movements come only from the order, return, and cancel services, never from this dialog.

## Done when

- A double-clicked adjustment creates exactly one movement.
- An adjustment that would push stock below reserved is rejected with a clear message.
