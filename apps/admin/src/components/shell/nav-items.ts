import {
  Boxes,
  ContactRound,
  FolderTree,
  History,
  Images,
  LayoutDashboard,
  type LucideIcon,
  MailPlus,
  Package,
  ShoppingBag,
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
    label: "Sales",
    items: [
      {
        title: "Orders",
        href: "/orders",
        icon: ShoppingBag,
        permission: "orders.read",
      },
      {
        title: "Customers",
        href: "/customers",
        icon: ContactRound,
        permission: "orders.read",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        title: "Stock levels",
        href: "/inventory",
        icon: Boxes,
        permission: "inventory.write",
      },
      {
        title: "Movements",
        href: "/inventory/movements",
        icon: History,
        permission: "inventory.write",
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
  // These parents have their own child entries in the sidebar.
  if (href === "/team" || href === "/inventory") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
