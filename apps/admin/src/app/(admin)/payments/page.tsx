import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { PaymentsView } from "@/features/payments/components/payments-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Payments | Eshanika Admin" };

export default async function PaymentsPage() {
  const { permissions } = await requireAdmin("/payments");
  if (!permissions.includes("payments.read")) {
    return <PermissionDenied area="payments" />;
  }
  return <PaymentsView />;
}
