import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CouponEditor } from "@/features/coupons/components/coupon-editor";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "New coupon | Eshanika Admin" };

export default async function NewCouponPage() {
  const { permissions } = await requireAdmin("/coupons/new");
  if (!permissions.includes("marketing.write")) {
    return <PermissionDenied area="coupons" />;
  }
  return <CouponEditor initialCoupon={null} />;
}
