import { db } from "@eshanika/database/db";
import { authEnv } from "@eshanika/env/auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
	baseURL: authEnv.BETTER_AUTH_URL,
	database: prismaAdapter(db, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
	},
	user: {
		modelName: "User",
	},
	session: {
		modelName: "Session",
	},
	account: {
		modelName: "Account",
	},
	verification: {
		modelName: "Verification",
	},
	secret: authEnv.BETTER_AUTH_SECRET,
	advanced: {
		database: {
			generateId: () => crypto.randomUUID(),
		},
	},
});
