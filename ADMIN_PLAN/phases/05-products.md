# 05 Products, variants, pricing

**Goal:** create, edit, publish, and archive products with their variants and prices.

## Build

- `/products`: search, filter by status, category, and tag, sort, cursor pagination, bulk publish and archive.
- `/products/new` and `/products/[id]`: name, slug, description, short description, categories, tags, tax status, and tax class.
- Simple product: one default variant, edited inline.
- Variable product: choose attributes marked `useForVariants`, choose options, generate variant combinations, then edit each variant.
- Variant fields: name, SKU, regular price, sale price with optional start and end dates, manage stock, backorder policy, weight, dimensions, default flag.
- Status flow: `draft -> active -> archived`, and `archived -> draft`. Publishing sets `publishedAt`.
- Saving checks `updatedAt`. A stale edit gets `CONFLICT` and a "reload" message. Warn before leaving with unsaved changes.

## Rules

- Publishing requires at least one active variant with a price, and exactly one default variant.
- Sale price must be lower than the regular price. The sale end date must be after the start date.
- SKUs are unique across all variants.
- A variant that is in any order or cart is archived, not deleted.

## Done when

- A variable product with 2 attributes and 4 variants can be created, priced, published, and archived.
- Two tabs editing the same product: the second save shows the conflict message.
