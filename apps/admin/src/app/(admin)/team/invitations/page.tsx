import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { InvitationsView } from "@/features/team/components/invitations-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Invitations | Eshanika Admin" };

export default async function InvitationsPage() {
  const { permissions } = await requireAdmin("/team/invitations");
  if (!permissions.includes("team.write")) {
    return <PermissionDenied area="team invitations" />;
  }
  return <InvitationsView />;
}
