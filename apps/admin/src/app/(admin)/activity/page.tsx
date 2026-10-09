import type { Metadata } from "next";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { ActivityView } from "@/features/activity/components/activity-view";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Activity | Eshanika Admin" };

export default async function ActivityPage() {
  const { permissions } = await requireAdmin("/activity");
  if (!permissions.includes("audit.read")) {
    return <PermissionDenied area="activity" />;
  }
  return <ActivityView />;
}
