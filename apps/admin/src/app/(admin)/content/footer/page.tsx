import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { FooterView } from "@/features/content/components/footer-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Footer | Eshanika Admin" };

export default async function FooterPage() {
  const { permissions } = await requireAdmin("/content/footer");
  if (!permissions.includes("content.write")) {
    return <PermissionDenied area="content" />;
  }
  return <FooterView />;
}
