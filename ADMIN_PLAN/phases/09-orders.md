# 09 Orders

**Goal:** process orders from placement to delivery.

## Build

- `/orders`: filter by order, payment, and fulfilment status and by date. Search by order number or email.
- `/orders/[id]`: items, addresses, totals, coupon, fees, payment status, a timeline from `OrderStatusHistory`, internal notes, and a print view (packing slip).
- `orders.transition(id, to, note)`, `orders.cancel(id, reason)`, `orders.addNote`.
- Cancelling releases reservations and writes `cancellation` stock movements. It never refunds automatically. The screen links to the refund action instead.

## Order status transitions

| From | To |
| --- | --- |
| created | confirmed, cancelled |
| confirmed | processing, shipped, cancelled |
| processing | shipped, cancelled |
| shipped | out_for_delivery, delivered, returned |
| out_for_delivery | delivered, returned |
| delivered | returned |

Every change writes `OrderStatusHistory` plus an audit row. Shipping-related statuses are normally set by fulfilment (Phase 10).

## Done when

- An order moves `created -> confirmed -> processing`. The timeline shows each step with who made it.
- Cancelling releases its reservation and shows a "refund needed" prompt when the order was paid.
