import "dotenv/config";
import { databaseEnv } from "@eshanika/env/database";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: databaseEnv.DATABASE_URL });

export const db = new PrismaClient({ adapter });
export type { Prisma } from "../generated/prisma/client";
