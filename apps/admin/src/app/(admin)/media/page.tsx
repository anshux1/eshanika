import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { MediaView } from "@/features/catalog/media/components/media-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Media | Eshanika Admin" };

export default async function MediaPage() {
  const { permissions } = await requireAdmin("/media");
  if (!permissions.includes("catalog.write")) {
    return <PermissionDenied area="the media library" />;
  }
  return <MediaView />;
}
