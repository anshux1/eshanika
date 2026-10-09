import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { PageEditor } from "@/features/content/components/page-editor";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "New page | Eshanika Admin" };

export default async function NewContentPage() {
  const { permissions } = await requireAdmin("/content/pages/new");
  if (!permissions.includes("content.write")) {
    return <PermissionDenied area="content" />;
  }
  return <PageEditor initialPage={null} />;
}
