# 16 Dashboard, reports, activity

**Goal:** see how the store is doing and what needs attention.

## Build

- `/` dashboard: today and 7-day sales, orders to process, low stock count, failed payments, pending refunds, failed webhook events. Each links to the filtered list.
- `/reports`: date range (IST days, at most 1 year). Sales (gross, discounts, refunds, net), top products, new vs returning customers, coupon usage, tax collected. CSV export.
- `/carts`: abandoned carts (status `abandoned`) with customer, items, value, and last activity. Read only.
- `/activity`: audit log filtered by actor, entity, action, and date.

## Rules

- Figures come from order snapshots, never from current prices.
- Refunds count on the day they were processed.

## Done when

- Report totals for a test range match a hand-checked SQL query over the same orders.
