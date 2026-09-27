import { getActiveAdmin } from "@eshanika/auth/membership";
import { auth } from "@eshanika/auth/server";
import { AdminRole } from "@eshanika/database/enums";
import { publicProcedure } from "@eshanika/orpc/base";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});

export const authRouter = {
  session: publicProcedure
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
  adminSession: publicProcedure
    .output(
      z.object({
        user: userSchema,
        role: z.enum(AdminRole),
      }),
    )
    .handler(async ({ context }) => {
      const currentSession = await auth.api.getSession({
        headers: context.headers,
      });
      if (!currentSession) throw new ORPCError("UNAUTHORIZED");

      const admin = await getActiveAdmin(currentSession.user.id);
      if (!admin) {
        throw new ORPCError("FORBIDDEN");
      }

      return {
        user: {
          id: currentSession.user.id,
          name: currentSession.user.name,
          email: currentSession.user.email,
        },
        role: admin.membershipRole,
      };
    }),
};
