import type { AdminRole } from "@eshanika/database/enums";

export type AdminPermission =
  | "catalog.write"
  | "inventory.write"
  | "content.write"
  | "orders.read"
  | "orders.write"
  | "payments.read"
  | "refunds.write"
  | "marketing.write"
  | "settings.write"
  | "reports.read"
  | "team.write"
  | "audit.read";

const ALL_PERMISSIONS: readonly AdminPermission[] = [
  "catalog.write",
  "inventory.write",
  "content.write",
  "orders.read",
  "orders.write",
  "payments.read",
  "refunds.write",
  "marketing.write",
  "settings.write",
  "reports.read",
  "team.write",
  "audit.read",
];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: ALL_PERMISSIONS,
  editor: ["catalog.write", "inventory.write", "content.write"],
  support: ["orders.read", "orders.write", "payments.read"],
};

export function hasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getRolePermissions(
  role: AdminRole,
): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role];
}
