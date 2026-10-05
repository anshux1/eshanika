import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CustomersView } from "@/features/customers/components/customers-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Customers | Eshanika Admin" };

export default async function CustomersPage() {
  const { permissions } = await requireAdmin("/customers");
  if (!permissions.includes("orders.read")) {
    return <PermissionDenied area="customers" />;
  }
  return <CustomersView />;
}
