# Database schema

`prisma/schema.prisma` is the source of truth for the 53 PostgreSQL models. Prisma Client is generated to `src/generated/prisma`, and SQL migrations are stored in `prisma/migrations`.

The schema keeps model and field names from the Prisma 8 contract. The 36 status and kind enums are native PostgreSQL enums, so both the database and the TypeScript client reject unknown values. Import their types and values from `@eshanika/database/enums`, which is safe in browser code.

Prisma 7 also returns `Date` for the contract's `TimestamptzString` fields and `bigint` for `BigIntNumber` fields. The PostgreSQL column types, nullability, defaults, and constraints are preserved, but those two client value types cannot be represented exactly in a Prisma 7 schema.

Run `pnpm --filter @eshanika/database db:generate` after schema changes. Workspace builds and development generate the client automatically from a clean checkout.
