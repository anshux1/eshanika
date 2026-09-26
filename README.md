# Eshanika

pnpm workspace with a Next.js admin app, shared shadcn/ui components, and a Prisma database package.

## Setup

Requires Node.js 24 and pnpm 12.

Set the same PostgreSQL `DATABASE_URL` in `packages/database/.env` and `apps/admin/.env`, using their `.env.example` files. Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in the admin app's `.env`.

```sh
pnpm install
pnpm --filter @eshanika/database db:migrate:deploy
pnpm build
```

Run the admin app with `pnpm dev`.
