import { ORPCError } from "@orpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ProductEditor } from "@/features/catalog/products/components/product-editor";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export const metadata: Metadata = { title: "Edit product | Eshanika Admin" };

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;
  const { permissions } = await requireAdmin(`/products/${id}`);
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="products" />;
  }
  const client = await getServerClient();
  const product = await client.catalog.products.get({ id }).catch((error) => {
    // A malformed ID fails validation, which is the same as a missing product.
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  });
  return <ProductEditor initialProduct={product} key={product.id} />;
}
