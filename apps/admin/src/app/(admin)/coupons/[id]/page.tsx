import { ORPCError } from "@orpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CouponEditor } from "@/features/coupons/components/coupon-editor";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export const metadata: Metadata = { title: "Coupon | Eshanika Admin" };

export default async function CouponPage({
  params,
}: PageProps<"/coupons/[id]">) {
  const { id } = await params;
  const { permissions } = await requireAdmin(`/coupons/${id}`);
  if (!permissions.includes("marketing.write")) {
    return <PermissionDenied area="coupons" />;
  }
  const client = await getServerClient();
  const coupon = await client.coupons.get({ id }).catch((error) => {
    // A malformed ID fails validation, which is the same as a missing coupon.
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  });
  return <CouponEditor initialCoupon={coupon} key={coupon.id} />;
}
