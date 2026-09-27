import { db } from "@eshanika/database/db";
import { sendPasswordResetEmail } from "@eshanika/email/send-password-reset-email";
import { authEnv } from "@eshanika/env/auth";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Only the admin origin is trusted, so callback and redirect URLs cannot point elsewhere.
// The upload route reuses this list so both entry points accept the same origins.
export const trustedOrigins = [new URL(authEnv.BETTER_AUTH_URL).origin];

export const auth = betterAuth({
	appName: "Eshanika Admin",
	baseURL: authEnv.BETTER_AUTH_URL,
	trustedOrigins,
	database: prismaAdapter(db, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		// Sign-up is closed. Accounts come only from invitations and the seed script.
		disableSignUp: true,
		// Admins are created verified by invitation or seed, never self-serve.
		requireEmailVerification: false,
		minPasswordLength: 12,
		resetPasswordTokenExpiresIn: 60 * 60,
		// A password change must kick out every other session right away.
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			await sendPasswordResetEmail(user.email, url);
		},
	},
	// No social providers. Email and password is the only way in.
	session: {
		modelName: "Session",
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		// Cookie caching stays off so a session revoked in the database fails the next request.
	},
	rateLimit: {
		enabled: true,
		// Database storage survives restarts, unlike memory. Upstash Redis can
		// replace this later by switching storage to "secondary-storage".
		storage: "database",
		window: 60,
		max: 100,
		customRules: {
			"/sign-in/email": { window: 60, max: 5 },
			"/request-password-reset": { window: 60, max: 5 },
			"/reset-password": { window: 60, max: 5 },
		},
	},
	user: {
		modelName: "User",
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
