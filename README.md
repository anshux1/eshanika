# Eshanika

pnpm workspace with a Next.js admin app, shared shadcn/ui components, and a Prisma database package.

## Setup

Requires Node.js 24 and pnpm 12.

```sh
pnpm install
pnpm build
```

Run the admin app with `pnpm --filter @eshanika/admin dev`.

The Prisma package starts with an empty contract. Set `DATABASE_URL` using `packages/database/.env.example`, then run `pnpm --filter @eshanika/database db:init` when a PostgreSQL database and models are ready.
