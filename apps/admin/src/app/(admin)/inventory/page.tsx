import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { InventoryView } from "@/features/inventory/components/inventory-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Stock levels | Eshanika Admin" };

export default async function InventoryPage() {
  const { permissions } = await requireAdmin("/inventory");
  if (!permissions.includes("inventory.write")) {
    return <PermissionDenied area="inventory" />;
  }
  return <InventoryView />;
}
