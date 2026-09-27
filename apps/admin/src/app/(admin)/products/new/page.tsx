import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ProductEditor } from "@/features/catalog/products/components/product-editor";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "New product | Eshanika Admin" };

export default async function NewProductPage() {
  const { permissions } = await requireAdmin("/products/new");
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="products" />;
  }
  return <ProductEditor initialProduct={null} />;
}
