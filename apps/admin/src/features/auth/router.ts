import { getAdminMembership } from "@eshanika/auth/membership";
import { auth } from "@eshanika/auth/server";
import { ORPCError, os } from "@orpc/server";
import { z } from "zod";

const procedure = os.$context<{ headers: Headers }>();
const userSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.email(),
});

export const authRouter = {
	session: procedure
		.output(z.object({ user: userSchema }).nullable())
		.handler(async ({ context }) => {
			const currentSession = await auth.api.getSession({
				headers: context.headers,
			});
			if (!currentSession) return null;

			return {
				user: {
					id: currentSession.user.id,
					name: currentSession.user.name,
					email: currentSession.user.email,
				},
			};
		}),
	adminSession: procedure
		.output(
			z.object({
				user: userSchema,
				role: z.enum(["owner", "editor", "support"]),
			}),
		)
		.handler(async ({ context }) => {
			const currentSession = await auth.api.getSession({
				headers: context.headers,
			});
			if (!currentSession) throw new ORPCError("UNAUTHORIZED");

			const membership = await getAdminMembership(currentSession.user.id);
			if (!membership || membership.status !== "active") {
				throw new ORPCError("FORBIDDEN");
			}

			return {
				user: {
					id: currentSession.user.id,
					name: currentSession.user.name,
					email: currentSession.user.email,
				},
				role: membership.role,
			};
		}),
};
