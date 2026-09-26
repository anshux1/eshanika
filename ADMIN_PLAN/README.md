# Eshanika Admin Plan

The plan for `apps/admin`, the internal back office for the Eshanika jewellery store. This folder replaces the old `ADMIN.md`, `ADMIN_PLAN.md`, and `ADMIN_PLAN/` files.

- `README.md` (this file): stack, current state, roles, routes, shared rules, and the phase list.
- `schema-changes.md`: database changes the admin needs before or during its phases.
- `phases/NN-*.md`: one short brief per feature. Build them in order.

## Current state (2026-09-26)

| Area | Status |
| --- | --- |
| Monorepo (pnpm + Turborepo, Biome, shared TS config) | Done |
| `packages/database`: Prisma 7 schema and migrations for all commerce models | Done (see `schema-changes.md`) |
| `packages/ui`: shadcn/Base UI primitives | Done |
| `packages/env`, `packages/orpc`: typed env, base procedure, pagination schema, and client/handler factories every app uses | Done (Phase 00) |
| `packages/auth`: Better Auth email/password, admin membership lookup, `auth.adminSession` | Started (Phase 01) |
| `apps/admin`: admin router, RPC and OpenAPI handlers, audit helper, providers, UI patterns, status home page | Done (Phase 00) |
| Google sign-in, admin screens, uploads, payments | Not started |

The old plans marked Phases 00 and 01 as done. That code no longer exists, so the plan starts again from Phase 00. Nothing from WordPress or WooCommerce is in scope: no import tools, no legacy data rules, no Elementor layouts.

## Stack

| Concern | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript strict, port 3000 |
| UI | shadcn/ui on Base UI, Tailwind v4, `@eshanika/ui` |
| Data | Neon PostgreSQL, Prisma 7 with the `pg` adapter (`@eshanika/database`) |
| API | oRPC + TanStack Query. Each app owns its router; `@eshanika/orpc` holds only shared plumbing. OpenAPI at `/api/v1` |
| Auth | Better Auth, email/password and Google (`@eshanika/auth`) |
| Env | T3 Env + Zod (`@eshanika/env`), validated at import |
| Forms | react-hook-form + Zod |
| Files | IDrive e2 (S3-compatible) through Better Upload |
| Payments | Razorpay |
| Rate limiting | Upstash Redis |
| Hosting | Self-hosted VPS, long-running Node process |

## Code layout

Each app owns its procedures. Admin procedures never exist in the store app, so the store's `/rpc` can never expose them. Shared packages hold only what both apps need.

```text
packages/
  database/   prisma/schema.prisma, prisma/migrations, src/prisma/db.ts
  env/        typed env per concern (database, auth, ...)
  auth/       Better Auth server and client, admin membership lookup
  orpc/src/   shared plumbing only, no routers:
                base.ts (request context, publicProcedure), pagination.ts,
                createRpcHandler, createServerClient, createClient, createQueryUtils
  services/   (added when the store needs it) business rules both apps share: coupons, shipping quote, stock, order totals
  ui/         shadcn primitives
apps/admin/src/
  app/
    (auth)/sign-in, invite/[token], unauthorized
    (admin)/            every protected screen, one server guard in layout.tsx
    rpc/[[...rest]], api/auth/[...all], api/v1/[[...rest]], api/upload, api/webhooks/razorpay
  orpc/
    router.ts           admin root router
    permissions.ts      role to permission map (Phase 01)
    procedures.ts       adminProcedure(permission) (Phase 01)
    audit.ts            audit(tx, ...) inside mutation transactions
    rpc-handler.ts, server-client.ts, client.ts, query.ts   one-line wrappers around the package factories
    openapi-handler.ts, external-router.ts                 public `/api/v1` API
  features/<area>/
    router.ts           procedures: validate, check permission, call the service
    service.ts          business rules and Prisma access
    components/         UI for this area
  components/patterns/  page header, page states, status badge, confirm dialog, pagination
  lib/money.ts
  proxy.ts
apps/store/             same shape: its own router (customer session, cart, checkout) plus the same four wrappers
```

Rules:

- A procedure lives in the app that exposes it. `packages/orpc` never exports a router.
- Logic stays in the app until a second app needs it. Then it moves to `packages/services`, which never imports oRPC, React, or Next.js.
- Route files stay thin. Server Components call procedures through `await getServerClient()`; client components use `orpc` from `@/orpc/query`.

## Roles and permissions

A user can use the admin only with `User.role = admin` and an `active` `AdminMembership`. The permission map is a code constant in `apps/admin/src/orpc/permissions.ts`, and the server checks it on every procedure.

| Permission | owner | editor | support |
| --- | :-: | :-: | :-: |
| `catalog.write` (products, categories, attributes, tags, media) | yes | yes | |
| `inventory.write` | yes | yes | |
| `content.write` (pages, footer, menus) | yes | yes | |
| `orders.read` (orders, customers, returns, fulfilment) | yes | | yes |
| `orders.write` | yes | | yes |
| `payments.read` | yes | | yes |
| `refunds.write` | yes | | |
| `marketing.write` (coupons) | yes | | |
| `settings.write` (shipping, fees) | yes | | |
| `reports.read` | yes | | |
| `team.write` (members, invitations) | yes | | |
| `audit.read` | yes | | |

Every admin can read the catalogue and the dashboard. There must always be at least one active owner.

## Route map

| Route | Phase | Permission |
| --- | :-: | --- |
| `/sign-in`, `/unauthorized`, `/invite/[token]` | 01, 03 | public |
| `/` dashboard | 02, 16 | any admin |
| `/team`, `/team/invitations` | 03 | `team.write` |
| `/categories`, `/attributes`, `/tags` | 04 | `catalog.write` |
| `/products`, `/products/new`, `/products/[id]` | 05 | `catalog.write` |
| `/media` | 06 | `catalog.write` |
| `/inventory`, `/inventory/movements` | 07 | `inventory.write` |
| `/customers`, `/customers/[id]` | 08 | `orders.read` |
| `/orders`, `/orders/[id]` (tabs: items, fulfilment, returns, payments) | 09-12 | `orders.read` |
| `/returns` | 11 | `orders.write` |
| `/payments`, `/payments/events` | 12 | `payments.read` |
| `/coupons`, `/coupons/new`, `/coupons/[id]` | 13 | `marketing.write` |
| `/settings/shipping`, `/settings/fees` | 14 | `settings.write` |
| `/content/pages`, `/content/pages/[id]`, `/content/footer`, `/content/menus` | 15 | `content.write` |
| `/reports`, `/activity`, `/carts` | 16 | `reports.read`, `audit.read` |

## Shared rules (every phase)

- The server authorizes every procedure. Hidden links are only a convenience.
- Zod validates every input. Errors use oRPC codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`. Never send SQL or provider messages to the browser.
- Every mutation writes an `AdminAuditLog` row in the same transaction. No passwords, tokens, or provider payloads in the log.
- Money is INR `Numeric(12,2)` decimal strings in the database and integer paise (`*Minor`) for Razorpay. No floating-point arithmetic. The server calculates every total.
- Order, item, address, tax, and fee amounts are snapshots. They are never recalculated.
- Status changes follow the transition tables in each phase brief and are enforced in `service.ts`.
- Archive instead of deleting anything that orders, carts, or history point to.
- Stock and money mutations take an idempotency key. Edits to shared records check `updatedAt` and return `CONFLICT` when the record is stale.
- Lists use cursor pagination (`{ items, nextCursor }`, limit 1 to 100). Filters, sort, and cursor live in the URL.
- Times are stored in UTC and shown in Asia/Kolkata.
- Every screen has loading, empty, error, and success states and works down to 360px wide. Destructive actions need a confirmation dialog.

## Phases

| # | Feature |
| :-: | --- |
| 00 | [Foundation](phases/00-foundation.md) |
| 01 | [Authentication](phases/01-authentication.md) |
| 02 | [Admin shell](phases/02-admin-shell.md) |
| 03 | [Team and invitations](phases/03-team.md) |
| 04 | [Categories, attributes, tags](phases/04-catalog-taxonomy.md) |
| 05 | [Products, variants, pricing](phases/05-products.md) |
| 06 | [Media](phases/06-media.md) |
| 07 | [Inventory](phases/07-inventory.md) |
| 08 | [Customers](phases/08-customers.md) |
| 09 | [Orders](phases/09-orders.md) |
| 10 | [Fulfilment and tracking](phases/10-fulfilment.md) |
| 11 | [Returns](phases/11-returns.md) |
| 12 | [Payments and refunds](phases/12-payments-refunds.md) |
| 13 | [Coupons](phases/13-coupons.md) |
| 14 | [Shipping and fees](phases/14-shipping-fees.md) |
| 15 | [Content and navigation](phases/15-content.md) |
| 16 | [Dashboard, reports, activity](phases/16-dashboard-reports.md) |
| 17 | [Launch readiness](phases/17-launch.md) |

## Definition of done (every phase)

1. Schema changes for the phase are applied (see `schema-changes.md`).
2. Procedures check permissions, validate input, audit mutations, and return safe errors.
3. Screens work end to end against a real database, including every state listed above.
4. `pnpm lint`, `pnpm check-types`, and `pnpm --filter @eshanika/admin build` pass. Schema changes ship as a Prisma migration.
5. The phase's "Done when" checks are verified in a headless browser, with screenshots.
6. The phase status in the table below is updated.

| Phase | Status |
| :-: | --- |
| 00 | Done (2026-09-26) |
| 01-17 | Not started |
