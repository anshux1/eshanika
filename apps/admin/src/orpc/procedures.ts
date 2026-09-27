import { type AdminIdentity, getActiveAdmin } from "@eshanika/auth/membership";
import { auth } from "@eshanika/auth/server";
import { publicProcedure } from "@eshanika/orpc/base";
import { ORPCError } from "@orpc/server";
import { type AdminPermission, hasPermission } from "./permissions";

export type AdminContext = {
  user: { id: string; name: string; email: string };
  admin: AdminIdentity;
};

function requirePermission(permission?: AdminPermission) {
  return publicProcedure.middleware(async ({ context, next }) => {
    const session = await auth.api.getSession({ headers: context.headers });
    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }
    const admin = await getActiveAdmin(session.user.id);
    if (!admin) {
      throw new ORPCError("FORBIDDEN");
    }
    if (permission && !hasPermission(admin.membershipRole, permission)) {
      throw new ORPCError("FORBIDDEN");
    }
    const adminContext: AdminContext = {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      admin,
    };
    return next({ context: { ...context, ...adminContext } });
  });
}

// Every admin procedure checks the membership in the database on each call,
// so suspended or revoked admins lose access right away. Pass a permission
// for anything beyond reading the catalogue and the dashboard.
export function adminProcedure(permission?: AdminPermission) {
  return publicProcedure.use(requirePermission(permission));
}
