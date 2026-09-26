# 08 Customers

**Goal:** support staff can find a customer and see their history.

## Build

- `/customers`: search by name, email, or phone. Shows order count, total spent, and last order date.
- `/customers/[id]`: profile, addresses, orders, and active cart.
- Read only. Customers manage their own details in the store.

## Rules

- Customers are `User.role = customer`. Admin accounts never appear here.
- Contact details are not written into audit logs or exports beyond what the screen shows.

## Done when

- Searching part of an email finds the customer, and the profile shows their orders linking to `/orders/[id]`.
