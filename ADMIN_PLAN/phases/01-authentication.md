# 01 Authentication

**Goal:** an admin signs in with email/password. Everyone else is kept out.

## Build

- Already in `packages/auth`: Better Auth with email/password and the Prisma adapter, `/api/auth/[...all]`, `getAdminMembership`, and `auth.adminSession` (UNAUTHORIZED when signed out, FORBIDDEN without an active membership).
- Still to add: secure cookies and exact trusted origins.
- Apply the Phase 01 items in `../schema-changes.md`.
- Sign-up is closed. Accounts come only from invitations (Phase 03) and a one-time seed script that creates the first owner.
- Upstash rate limits on sign-in and password reset.
- Password reset by email through Resend (`packages/email`).
- `proxy.ts`: send signed-out visitors to `/sign-in?next=...`. It only redirects. The real check is the server guard.
- `apps/admin/src/orpc/permissions.ts` (map from the README) and `adminProcedure(permission)` in `apps/admin/src/orpc/procedures.ts`. `auth.adminSession` should reuse the same check.
- `requireAdmin()` for layouts and `adminProcedure` for RPC. Both read the membership from the database on every request, so suspended users lose access right away.

## Screens

- `/sign-in`: email/password form and forgot password.
- `/unauthorized`: signed in but not an active admin. Offers sign-out.
- `next` redirects accept same-origin paths only.

## Done when

- An active admin signs in and lands on `next` or `/`.
- A customer and a suspended admin both end on `/unauthorized`.
- Five wrong passwords in a row are rate limited.
- A session revoked in the database fails the next request.
