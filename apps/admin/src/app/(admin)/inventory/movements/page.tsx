import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { MovementsView } from "@/features/inventory/components/movements-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = {
  title: "Stock movements | Eshanika Admin",
};

export default async function MovementsPage() {
  const { permissions } = await requireAdmin("/inventory/movements");
  if (!permissions.includes("inventory.write")) {
    return <PermissionDenied area="inventory" />;
  }
  return <MovementsView />;
}
