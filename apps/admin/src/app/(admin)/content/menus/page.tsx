import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { MenusView } from "@/features/content/components/menus-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Menus | Eshanika Admin" };

export default async function MenusPage() {
  const { permissions } = await requireAdmin("/content/menus");
  if (!permissions.includes("content.write")) {
    return <PermissionDenied area="content" />;
  }
  return <MenusView />;
}
