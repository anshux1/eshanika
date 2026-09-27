import { SidebarInset, SidebarProvider } from "@eshanika/ui/components/sidebar";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SiteHeader } from "@/components/shell/site-header";
import { getServerClient } from "@/orpc/server-client";

// Only loads shell data. Each page runs requireAdmin, because layouts are not
// re-rendered on client navigation.
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const client = await getServerClient();
  const me = await client.admin.me().catch(() => null);

  return (
    <SidebarProvider
      defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
    >
      <AppSidebar me={me} />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
