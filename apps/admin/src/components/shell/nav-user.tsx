"use client";

import { authClient } from "@eshanika/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@eshanika/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@eshanika/ui/components/sidebar";
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { StatusBadge } from "@/components/patterns/status-badge";
import { initials } from "@/lib/format";
import type { RouterOutputs } from "@/orpc/types";

const ROLE_LABELS = { owner: "Owner", editor: "Editor", support: "Support" };

export function NavUser({ me }: { me: RouterOutputs["admin"]["me"] }) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const avatar = (
    <Avatar className="rounded-lg after:rounded-lg">
      {me.image ? <AvatarImage alt="" src={me.image} /> : null}
      <AvatarFallback className="rounded-lg bg-sidebar-primary/10 font-medium text-sidebar-primary">
        {initials(me.name)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="aria-expanded:bg-sidebar-accent"
                size="lg"
              />
            }
          >
            {avatar}
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{me.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {me.email}
              </span>
            </div>
            <ChevronsUpDown aria-hidden className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-60"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  {avatar}
                  <div className="grid flex-1 leading-tight">
                    <span className="truncate font-medium text-foreground">
                      {me.name}
                    </span>
                    <span className="truncate text-xs">{me.email}</span>
                  </div>
                  <StatusBadge tone="neutral">
                    {ROLE_LABELS[me.role]}
                  </StatusBadge>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun aria-hidden className="dark:hidden" />
                <Moon aria-hidden className="hidden dark:block" />
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
                  <DropdownMenuRadioItem value="light">
                    <Sun aria-hidden />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon aria-hidden />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor aria-hidden />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <LogOut aria-hidden />
              {signingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
