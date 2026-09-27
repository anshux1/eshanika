import { type AdminIdentity, getActiveAdmin } from "@eshanika/auth/membership";
import { auth } from "@eshanika/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type AdminPermission, getRolePermissions } from "@/orpc/permissions";

export type RequiredAdmin = {
  user: { id: string; name: string; email: string };
  admin: AdminIdentity;
  permissions: readonly AdminPermission[];
};

// Only same-origin paths are accepted, so a next parameter can never bounce to another site.
export function toSafeNextPath(value: string | null): string {
  if (!value) {
    return "/";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

// Server-side guard for admin pages. The proxy only redirects signed-out
// visitors, so every page re-checks the membership here on each request.
export async function requireAdmin(nextPath?: string): Promise<RequiredAdmin> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/sign-in?next=${encodeURIComponent(toSafeNextPath(nextPath ?? null))}`,
    );
  }
  const admin = await getActiveAdmin(session.user.id);
  if (!admin) {
    redirect("/unauthorized");
  }
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    admin,
    permissions: getRolePermissions(admin.membershipRole),
  };
}
