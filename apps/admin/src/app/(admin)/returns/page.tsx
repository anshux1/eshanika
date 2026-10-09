import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ReturnsView } from "@/features/returns/components/returns-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Returns | Eshanika Admin" };

export default async function ReturnsPage() {
  const { permissions } = await requireAdmin("/returns");
  if (!permissions.includes("orders.read")) {
    return <PermissionDenied area="returns" />;
  }
  return <ReturnsView />;
}
