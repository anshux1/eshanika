import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ReportsView } from "@/features/reports/components/reports-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Reports | Eshanika Admin" };

export default async function ReportsPage() {
  const { permissions } = await requireAdmin("/reports");
  if (!permissions.includes("reports.read")) {
    return <PermissionDenied area="reports" />;
  }
  return <ReportsView />;
}
