import { Button } from "@eshanika/ui/components/button";
import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/patterns/page-header";
import { PermissionDenied } from "@/components/patterns/permission-denied";
import { MembersTable } from "@/features/team/components/members-table";
import { TeamTabs } from "@/features/team/components/team-tabs";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Team | Eshanika Admin" };

export default async function TeamPage() {
  const { user, permissions } = await requireAdmin("/team");
  if (!permissions.includes("team.write")) {
    return <PermissionDenied area="the team" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={
          <Button
            nativeButton={false}
            render={
              <Link href="/team/invitations">
                <UserPlus aria-hidden />
                Invite member
              </Link>
            }
          />
        }
        description="Everyone with admin access, their role, and status."
        title="Team"
      />
      <TeamTabs />
      <MembersTable currentUserId={user.id} />
    </div>
  );
}
