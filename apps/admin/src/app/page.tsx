import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { PageHeader } from "@/components/patterns/page-header";
import { StatusBadge } from "@/components/patterns/status-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrowserHealthCheck } from "@/features/health/components/browser-health-check";
import { requireAdmin } from "@/lib/require-admin";
import { getServerClient } from "@/orpc/server-client";

export default async function Home() {
  await requireAdmin("/");
  const client = await getServerClient();
  const serverPing = await client.health.ping().catch(() => null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
      <PageHeader
        actions={<ThemeToggle />}
        description="The admin workspace is being set up. Sign-in and the main screens come next."
        title="Eshanika Admin"
      />

      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>
            Checks that the app can reach the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Server to database</span>
            {serverPing ? (
              <StatusBadge tone="success">Connected</StatusBadge>
            ) : (
              <StatusBadge tone="danger">Unavailable</StatusBadge>
            )}
          </div>
          <BrowserHealthCheck />
        </CardContent>
      </Card>
    </main>
  );
}
