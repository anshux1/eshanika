# 11 Returns

**Goal:** handle returned items step by step.

## Build

- `/returns` list and a Returns tab on `/orders/[id]`.
- Create a return from the order (admin-created for now): items, quantities, reason.
- Steps: approve or reject, mark received, restock chosen quantities (writes `return` movements), complete.

## Return status transitions

| From | To |
| --- | --- |
| requested | approved, rejected, cancelled |
| approved | received, cancelled |
| received | completed |

## Rules

- Return quantities cannot exceed delivered quantities minus earlier returns.
- A return never refunds or restocks by itself. Both are explicit actions.

## Done when

- A delivered item is returned, received, and half restocked. The ledger shows the movement, and the order links to a refund.
