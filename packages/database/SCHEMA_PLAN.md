# Database schema

`prisma/schema.prisma` is the source of truth for the 55 PostgreSQL models. Prisma Client is generated to `src/generated/prisma`, and the initial SQL migration is stored in `prisma/migrations`.

The schema keeps model and field names from the Prisma 8 contract. Enum-backed columns remain `text` with CHECK constraints in the initial migration. Prisma 7 models those fields as `String`, so its client does not enforce the enum value sets in TypeScript.

Prisma 7 also returns `Date` for the contract's `TimestamptzString` fields and `bigint` for `BigIntNumber` fields. The PostgreSQL column types, nullability, defaults, and constraints are preserved, but those two client value types cannot be represented exactly in a Prisma 7 schema.

Run `pnpm --filter @eshanika/database db:generate` after schema changes. Workspace builds and development generate the client automatically from a clean checkout.
