# 13 Coupons

**Goal:** create and manage discount codes.

## Build

- `/coupons` list with active, scheduled, expired, and archived filters.
- `/coupons/new` and `/coupons/[id]`: code, fixed or percentage, value, minimum subtotal, maximum discount, start and end dates, usage limit, per-customer limit, free-shipping benefit.
- Usage history from `CouponRedemption`: order, customer, discount.
- Archive instead of delete.

## Rules

- Codes are stored uppercase and trimmed, and are unique.
- Percentage value is 1 to 100. A fixed value is greater than zero.
- Once a coupon has been redeemed, its kind and value are locked.
- Usage limits are checked at checkout inside the order transaction, so concurrent redemptions cannot exceed them. That service lives here and the store calls it.

## Done when

- A 10% coupon capped at 500 INR with a limit of 1 use can be created and archived, and its redemptions show on its page.
