# 00 Foundation

**Goal:** the admin app can talk to the database through typed oRPC procedures, with shared UI patterns ready for every later phase.

## Build

- Apply the Phase 00 items in `../schema-changes.md` as a Prisma migration.
- Env validation through `@eshanika/env` (already in place): a missing variable fails on import, which stops `next build`.
- `packages/orpc`: shared plumbing only, no routers. `base.ts` (request context with headers and request ID, `publicProcedure`), `pagination.ts`, and generic factories `createRpcHandler(router)`, `createServerClient(router, headers)`, `createClient<Router>()`, `createQueryUtils(client)`. Each app wraps them in one line each. `adminProcedure(permission)` needs the permission map, so it moves to Phase 01.
- `apps/admin/src/orpc/`: admin router, `rpc-handler.ts`, `openapi-handler.ts`, `external-router.ts`, `server-client.ts`, `client.ts`, `query.ts`, `audit.ts`. Procedures live in `features/<area>/router.ts` (`auth`, `health`).
- `createRpcHandler` logs unexpected errors with the request ID and returns `x-request-id` and `cache-control: no-store`. oRPC already hides unexpected errors as `INTERNAL_SERVER_ERROR`.
- `getServerClient()` in admin, so Server Components call procedures in-process.
- `health.ping` procedure that touches the database.
- `audit.ts`: `audit(tx, { action, entityType, entityId, ... })`, used inside the mutation's transaction. `AdminAuditLog` is admin-only, so it lives in the admin app.
- `apps/admin/src/app/providers.tsx`: theme, TanStack Query (30s stale time, no refetch on focus, no mutation retries), tooltips, and toasts.
- `apps/admin/src/lib/money.ts`: INR formatting and decimal/paise conversion with no floats.
- UI primitives in `packages/ui` through the shadcn CLI.
- Shared patterns in `apps/admin/src/components/patterns/`: page header, loading, empty, and error states, cursor pagination, status badge, confirm dialog.

## Done when

- `health.ping` answers from both a Server Component and the browser.
- A missing env variable stops the build with a clear message.
- Lint, type check, and build pass.

## Status: done (2026-09-26)

- Local dev database `eshanika_dev` on the VM's Postgres, with both migrations applied. `DATABASE_URL` is in `packages/database/.env` and `apps/admin/.env`. `BETTER_AUTH_*` is in `apps/admin/.env`.
- Verified: lint, type check, and build pass. `health.ping` returns ok with `x-request-id` and `cache-control: no-store`. The home page shows both checks as Connected at 1280px (light) and 360px (dark) with no console errors. A build without `DATABASE_URL` fails with "Invalid environment variables". Audit rows commit with their transaction and roll back with it. Email sign-up still creates a session, and `auth.adminSession` returns `FORBIDDEN` for a non-admin.
