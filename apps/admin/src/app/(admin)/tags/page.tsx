import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { TagsView } from "@/features/catalog/taxonomy/components/tags-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Tags | Eshanika Admin" };

export default async function TagsPage() {
  const { permissions } = await requireAdmin("/tags");
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="tags" />;
  }
  return <TagsView />;
}
