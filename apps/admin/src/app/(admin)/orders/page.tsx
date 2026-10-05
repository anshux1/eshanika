import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { OrdersView } from "@/features/orders/components/orders-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Orders | Eshanika Admin" };

export default async function OrdersPage() {
  const { permissions } = await requireAdmin("/orders");
  if (!permissions.includes("orders.read")) {
    return <PermissionDenied area="orders" />;
  }
  return <OrdersView />;
}
