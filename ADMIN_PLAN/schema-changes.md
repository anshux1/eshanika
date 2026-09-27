# Schema changes needed

The Prisma schema in `packages/database/prisma/schema.prisma` is almost ready. Each change ships as a migration (`pnpm --filter @eshanika/database db:migrate:dev`). These changes come from dropping WordPress/WooCommerce, switching admin sign-in to email-only, and a few gaps found while planning. Apply each group in the phase listed.

## Phase 00: remove WordPress/WooCommerce leftovers (done, migration `remove_legacy_import_fields`)

- Delete the `ImportRun` and `ImportRecord` models and the `ImportRunStatus` and `ImportRecordStatus` enums.
- Remove the `sourcePostId`, `sourceTermId`, `sourceZoneId`, `sourceInstanceId`, `sourceOrderItemId`, and `sourceOrderId` fields from `ContentEntry`, `NavigationMenu`, `NavigationMenuItem`, `CheckoutFeeRule`, `ProductTag`, `ShippingZone`, `ShippingMethod`, `OrderFee`, and `Order`.
- Remove `ContentEntry.sourceLayout` (Elementor JSON).

## Phase 00: missing relations (done)

- `ReturnItem`: add relations to `ReturnRequest` and `OrderItem`.
- `VariantAttributeOption`: add a relation to `AttributeOption`.
- `ProductAttributeOption`: add a relation to `Attribute`, or drop the redundant `attributeId`.

## Phase 00: native enums (done, migration `use_native_enums`)

- Replace the 42 text columns guarded by CHECK constraints with 36 native PostgreSQL enums, converted in place so data is kept.

## Phase 01: authentication

- Check the Better Auth tables (`User`, `Session`, `Account`, `Verification`) against the current Better Auth docs for email/password sign-in.
- Rate limiting uses Upstash, so drop `AuthRateBucket`. Keep `AuthEvent` only if Phase 01 writes to it. Otherwise drop it.
- `User.phoneNumber` and `phoneNumberVerified`: keep them only if the storefront will use phone login. Decide when the store app is planned.
- Applied 2026-09-26 (migrations `drop_unused_auth_tables`, `add_rate_limit_table`): dropped `AuthRateBucket` and `AuthEvent` (both unused). Added `RateLimit` for Better Auth database rate limiting, since no Upstash Redis is provisioned yet; switching storage to Upstash later needs no schema change.

## Phase 03: invitations

- `AdminInvitation`: replace `phoneNumber` with `email`. Add relations for `invitedByUserId` and `acceptedByUserId` to `User`.

## Later phases

- Phase 12: add a `refunds` relation from `ReturnRequest` if refunds should link to the return that caused them.
- Phase 14: `OrderFee` exists, but order totals have no fee component. Add `Order.feeAmount` before turning on the COD fee.
