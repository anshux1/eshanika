import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ProductsView } from "@/features/catalog/products/components/products-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Products | Eshanika Admin" };

export default async function ProductsPage() {
  const { permissions } = await requireAdmin("/products");
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="products" />;
  }
  return <ProductsView />;
}
