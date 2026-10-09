import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ShippingView } from "@/features/shipping/components/shipping-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Shipping | Eshanika Admin" };

export default async function ShippingSettingsPage() {
  const { permissions } = await requireAdmin("/settings/shipping");
  if (!permissions.includes("settings.write")) {
    return <PermissionDenied area="shipping settings" />;
  }
  return <ShippingView />;
}
