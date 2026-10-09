import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CodFeeView } from "@/features/fees/components/cod-fee-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Fees | Eshanika Admin" };

export default async function FeeSettingsPage() {
  const { permissions } = await requireAdmin("/settings/fees");
  if (!permissions.includes("settings.write")) {
    return <PermissionDenied area="fee settings" />;
  }
  return <CodFeeView />;
}
