import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CouponsView } from "@/features/coupons/components/coupons-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Coupons | Eshanika Admin" };

export default async function CouponsPage() {
  const { permissions } = await requireAdmin("/coupons");
  if (!permissions.includes("marketing.write")) {
    return <PermissionDenied area="coupons" />;
  }
  return <CouponsView />;
}
