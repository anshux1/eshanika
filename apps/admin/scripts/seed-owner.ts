import { db } from "@eshanika/database/db";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

// One-time script that creates the first admin owner. Sign-up is closed, so
// this is the only way to bootstrap access before invitations exist.
// Run: ADMIN_SEED_NAME="..." ADMIN_SEED_EMAIL="..." ADMIN_SEED_PASSWORD="..." pnpm seed:owner

const seedInput = z.object({
  name: z.string().trim().min(1, "ADMIN_SEED_NAME is required"),
  email: z.email("ADMIN_SEED_EMAIL must be a valid email"),
  password: z
    .string()
    .min(12, "ADMIN_SEED_PASSWORD needs at least 12 characters"),
});

async function main(): Promise<void> {
  const input = seedInput.parse({
    name: process.env.ADMIN_SEED_NAME,
    email: process.env.ADMIN_SEED_EMAIL,
    password: process.env.ADMIN_SEED_PASSWORD,
  });

  const existingAdmins = await db.adminMembership.count();
  if (existingAdmins > 0) {
    throw new Error("An admin already exists, the seed script runs only once");
  }

  const existingUser = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error(`A user with email ${input.email} already exists`);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);

  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        name: input.name,
        email: input.email,
        emailVerified: true,
        role: "admin",
      },
    });
    await tx.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      },
    });
    await tx.adminMembership.create({
      data: {
        userId,
        role: "owner",
        status: "active",
      },
    });
  });

  console.log(`Owner ${input.email} created`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
