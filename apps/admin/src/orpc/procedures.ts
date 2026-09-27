import { type AdminIdentity, getActiveAdmin } from "@eshanika/auth/membership";
import { auth } from "@eshanika/auth/server";
import { publicProcedure } from "@eshanika/orpc/base";
import { ORPCError } from "@orpc/server";
import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "./audit";
import { type AdminPermission, hasPermission } from "./permissions";

export type AdminContext = {
  user: { id: string; name: string; email: string; image: string | null };
  admin: AdminIdentity;
  actor: AdminActor;
};

function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  return typeof error.code === "string" ? error.code : null;
}

// Converts service and database errors into safe oRPC errors. Anything else
// becomes oRPC's generic INTERNAL_SERVER_ERROR, so SQL never reaches the browser.
const errorBoundary = publicProcedure.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof AdminError) {
      throw new ORPCError(error.code, { message: error.message, cause: error });
    }
    const code = prismaErrorCode(error);
    if (code === "P2002") {
      throw new ORPCError("CONFLICT", {
        message: "Another record already uses this slug, SKU, or email.",
        cause: error,
      });
    }
    if (code === "P2003") {
      throw new ORPCError("CONFLICT", {
        message:
          "A linked record is missing or still in use. Reload and try again.",
        cause: error,
      });
    }
    if (code === "P2034") {
      throw new ORPCError("CONFLICT", {
        message: "This record changed while saving. Reload and try again.",
        cause: error,
      });
    }
    throw error;
  }
});

// For admin-app routes anyone can call, such as invitation links.
export const openProcedure = publicProcedure.use(errorBoundary);

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
        image: session.user.image ?? null,
      },
      admin,
      actor: {
        userId: session.user.id,
        role: admin.membershipRole,
        requestId: context.requestId,
      },
    };
    return next({ context: { ...context, ...adminContext } });
  });
}

// Every admin procedure checks the membership in the database on each call,
// so suspended or revoked admins lose access right away. Pass a permission
// for anything beyond reading the catalogue and the dashboard.
export function adminProcedure(permission?: AdminPermission) {
  return openProcedure.use(requirePermission(permission));
}
