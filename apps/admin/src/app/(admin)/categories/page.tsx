import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { CategoriesView } from "@/features/catalog/taxonomy/components/categories-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Categories | Eshanika Admin" };

export default async function CategoriesPage() {
  const { permissions } = await requireAdmin("/categories");
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="categories" />;
  }
  return <CategoriesView />;
}
