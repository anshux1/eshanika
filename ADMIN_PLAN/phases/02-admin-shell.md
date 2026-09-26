# 02 Admin shell

**Goal:** a protected layout every screen lives in.

## Build

- `app/(admin)/layout.tsx` with the `requireAdmin()` guard.
- `admin.me` procedure: name, email, image, role, permissions.
- Sidebar grouped as Overview, Catalogue, Sales, Marketing, Content, Settings, Team. Items are filtered by permission. A sheet drawer is used below `md`.
- Top bar with breadcrumbs and a user menu (theme, sign out).
- Route-level `loading.tsx`, `error.tsx`, and `not-found.tsx`.
- An `UNAUTHORIZED` error from any query sends the user to `/sign-in`. `FORBIDDEN` shows a permission message.
- `/` shows a simple welcome until Phase 16 builds the dashboard.

## Done when

- Each role sees only its own navigation items. Typing a forbidden URL shows the permission message, not data.
- Works at 360px, 768px, and 1280px in light and dark mode.
