import { ORPCError } from "@orpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { PageEditor } from "@/features/content/components/page-editor";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export const metadata: Metadata = { title: "Edit page | Eshanika Admin" };

export default async function EditContentPage({
  params,
}: PageProps<"/content/pages/[id]">) {
  const { id } = await params;
  const { permissions } = await requireAdmin(`/content/pages/${id}`);
  if (!permissions.includes("content.write")) {
    return <PermissionDenied area="content" />;
  }
  const client = await getServerClient();
  const page = await client.content.pages.get({ id }).catch((error) => {
    // A malformed ID fails validation, which is the same as a missing page.
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  });
  return <PageEditor initialPage={page} key={page.id} />;
}
