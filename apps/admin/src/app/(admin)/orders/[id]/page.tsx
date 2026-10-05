import { ORPCError } from "@orpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { OrderDetail } from "@/features/orders/components/order-detail";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export const metadata: Metadata = { title: "Order | Eshanika Admin" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const { permissions } = await requireAdmin(`/orders/${id}`);
  if (!permissions.includes("orders.read")) {
    return <PermissionDenied area="orders" />;
  }
  const client = await getServerClient();
  const order = await client.orders.get({ id }).catch((error) => {
    // A malformed ID fails validation, which is the same as a missing order.
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  });
  return (
    <OrderDetail
      canWrite={permissions.includes("orders.write")}
      initialOrder={order}
      key={order.id}
    />
  );
}
