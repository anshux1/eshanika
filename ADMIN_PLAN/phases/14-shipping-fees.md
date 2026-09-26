# 14 Shipping and fees

**Goal:** configure shipping methods and the cash-on-delivery fee.

## Build

- `/settings/shipping`: zones, each with ordered methods. A method is flat rate or free shipping. Requirement: none, minimum subtotal, or coupon. Also cost, taxable flag, and "ignore discounts".
- `/settings/fees`: the COD fee rule (amount, taxable, enabled).
- A shipping quote service the store's checkout will call. Build it here with a preview on the settings page ("cart of X INR gets these methods").

## Rules

- New zones, methods, and fees start disabled.
- Enabling the COD fee requires the `Order.feeAmount` change in `../schema-changes.md`, so totals stay correct.
- Changes never affect existing orders.

## Done when

- A free-shipping method with a minimum subtotal of 999 INR shows up in the preview only for carts at or above 999.
