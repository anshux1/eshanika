import {
  FolderTree,
  Images,
  LayoutDashboard,
  type LucideIcon,
  MailPlus,
  Package,
  SlidersHorizontal,
  Tags,
  Users,
} from "lucide-react";
import type { AdminPermission } from "@/orpc/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: AdminPermission;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [{ title: "Overview", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Catalogue",
    items: [
      {
        title: "Products",
        href: "/products",
        icon: Package,
        permission: "catalog.write",
      },
      {
        title: "Categories",
        href: "/categories",
        icon: FolderTree,
        permission: "catalog.write",
      },
      {
        title: "Attributes",
        href: "/attributes",
        icon: SlidersHorizontal,
        permission: "catalog.write",
      },
      { title: "Tags", href: "/tags", icon: Tags, permission: "catalog.write" },
      {
        title: "Media",
        href: "/media",
        icon: Images,
        permission: "catalog.write",
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        title: "Members",
        href: "/team",
        icon: Users,
        permission: "team.write",
      },
      {
        title: "Invitations",
        href: "/team/invitations",
        icon: MailPlus,
        permission: "team.write",
      },
    ],
  },
];

// Hiding links is only a convenience. Every page and procedure checks again.
export function visibleNavGroups(permissions: readonly string[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || permissions.includes(item.permission),
    ),
  })).filter((group) => group.items.length > 0);
}

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/team") return pathname === "/team";
  return pathname === href || pathname.startsWith(`${href}/`);
}
