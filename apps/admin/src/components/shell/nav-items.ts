import {
  Activity,
  Boxes,
  ChartColumn,
  ContactRound,
  CreditCard,
  FileText,
  FolderTree,
  History,
  Images,
  LayoutDashboard,
  type LucideIcon,
  MailPlus,
  Menu,
  Package,
  PanelBottom,
  ReceiptIndianRupee,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  TicketPercent,
  Truck,
  Undo2,
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
        title: "Returns",
        href: "/returns",
        icon: Undo2,
        permission: "orders.read",
      },
      {
        title: "Payments",
        href: "/payments",
        icon: CreditCard,
        permission: "payments.read",
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
    label: "Marketing",
    items: [
      {
        title: "Coupons",
        href: "/coupons",
        icon: TicketPercent,
        permission: "marketing.write",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        title: "Pages",
        href: "/content/pages",
        icon: FileText,
        permission: "content.write",
      },
      {
        title: "Menus",
        href: "/content/menus",
        icon: Menu,
        permission: "content.write",
      },
      {
        title: "Footer",
        href: "/content/footer",
        icon: PanelBottom,
        permission: "content.write",
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
    label: "Settings",
    items: [
      {
        title: "Shipping",
        href: "/settings/shipping",
        icon: Truck,
        permission: "settings.write",
      },
      {
        title: "Fees",
        href: "/settings/fees",
        icon: ReceiptIndianRupee,
        permission: "settings.write",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: ChartColumn,
        permission: "reports.read",
      },
      {
        title: "Abandoned carts",
        href: "/carts",
        icon: ShoppingCart,
        permission: "reports.read",
      },
      {
        title: "Activity",
        href: "/activity",
        icon: Activity,
        permission: "audit.read",
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
