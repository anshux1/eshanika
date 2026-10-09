import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { PaymentEventsView } from "@/features/payments/components/payment-events-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Webhook events | Eshanika Admin" };

export default async function PaymentEventsPage() {
  const { permissions } = await requireAdmin("/payments/events");
  if (!permissions.includes("payments.read")) {
    return <PermissionDenied area="payments" />;
  }
  return <PaymentEventsView />;
}
