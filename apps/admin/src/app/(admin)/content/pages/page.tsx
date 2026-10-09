import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { PagesView } from "@/features/content/components/pages-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Pages | Eshanika Admin" };

export default async function PagesPage() {
  const { permissions } = await requireAdmin("/content/pages");
  if (!permissions.includes("content.write")) {
    return <PermissionDenied area="content" />;
  }
  return <PagesView />;
}
