import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { AttributesView } from "@/features/catalog/taxonomy/components/attributes-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Attributes | Eshanika Admin" };

export default async function AttributesPage() {
  const { permissions } = await requireAdmin("/attributes");
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="attributes" />;
  }
  return <AttributesView />;
}
