import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CartsView } from "@/features/reports/components/carts-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Abandoned carts | Eshanika Admin" };

export default async function CartsPage() {
  const { permissions } = await requireAdmin("/carts");
  if (!permissions.includes("reports.read")) {
    return <PermissionDenied area="abandoned carts" />;
  }
  return <CartsView />;
}
