# 10 Fulfilment and tracking

**Goal:** ship orders, fully or in parts, with tracking.

## Build

- "Create shipment" on the order: choose items and quantities, carrier, tracking number, and tracking URL.
- `fulfilments.create`, `fulfilments.transition`, `fulfilments.addEvent`. Events are shown as a timeline.
- Keep `Order.fulfillmentStatus` and `Order.status` in step with the shipments.
- Shipping consumes the item's inventory reservations and writes `sale` movements.

## Fulfilment status transitions

| From | To |
| --- | --- |
| pending | packed |
| packed | shipped |
| shipped | out_for_delivery, delivered, failed, returned |
| out_for_delivery | delivered, failed, returned |
| failed | out_for_delivery, delivered, returned |
| delivered | returned |

## Rules

- A line can never ship more than was ordered minus what already shipped.

## Done when

- An order with 3 items ships in 2 shipments and ends as `delivered`. Trying to ship a 4th unit is rejected.
