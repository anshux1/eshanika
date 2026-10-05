import { ORPCError } from "@orpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CustomerOrders } from "@/features/customers/components/customer-orders";
import { CustomerProfile } from "@/features/customers/components/customer-profile";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export const metadata: Metadata = { title: "Customer | Eshanika Admin" };

export default async function CustomerPage({
  params,
}: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const { permissions } = await requireAdmin(`/customers/${id}`);
  if (!permissions.includes("orders.read")) {
    return <PermissionDenied area="customers" />;
  }
  const client = await getServerClient();
  const customer = await client.customers.get({ id }).catch((error) => {
    if (error instanceof ORPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return (
    <CustomerProfile
      customer={customer}
      orders={<CustomerOrders customerId={customer.id} />}
    />
  );
}
