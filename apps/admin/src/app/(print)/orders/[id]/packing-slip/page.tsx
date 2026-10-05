import { ORPCError } from "@orpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { PackingSlip } from "@/features/orders/components/packing-slip";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export const metadata: Metadata = { title: "Packing slip | Eshanika Admin" };

export default async function PackingSlipPage({
  params,
}: PageProps<"/orders/[id]/packing-slip">) {
  const { id } = await params;
  const { permissions } = await requireAdmin(`/orders/${id}/packing-slip`);
  if (!permissions.includes("orders.read")) {
    return <PermissionDenied area="orders" />;
  }
  const client = await getServerClient();
  const order = await client.orders.get({ id }).catch((error) => {
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  });
  return <PackingSlip order={order} />;
}
