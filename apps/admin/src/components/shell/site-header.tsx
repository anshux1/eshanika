"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@eshanika/ui/components/breadcrumb";
import { Separator } from "@eshanika/ui/components/separator";
import { SidebarTrigger } from "@eshanika/ui/components/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const SEGMENT_LABELS: Record<string, string> = {
  products: "Products",
  categories: "Categories",
  attributes: "Attributes",
  tags: "Tags",
  media: "Media",
  team: "Team",
  invitations: "Invitations",
  new: "New product",
  orders: "Orders",
  customers: "Customers",
  inventory: "Stock levels",
  movements: "Movements",
};

// Record IDs are named after the list they belong to.
const RECORD_LABELS: Record<string, string> = {
  orders: "Order",
  customers: "Customer",
};

type Crumb = { label: string; href: string };

function crumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Overview", href: "/" }];
  segments.forEach((segment, index) => {
    crumbs.push({
      // Unknown segments are record IDs, such as a product being edited.
      label:
        SEGMENT_LABELS[segment] ??
        RECORD_LABELS[segments[index - 1] ?? ""] ??
        "Edit",
      href: `/${segments.slice(0, index + 1).join("/")}`,
    });
  });
  if (segments[0] === "team" && segments.length === 1) {
    crumbs.push({ label: "Members", href: "/team" });
  }
  return crumbs;
}

export function SiteHeader() {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:rounded-t-xl">
      <SidebarTrigger className="-ml-1" />
      <Separator
        className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        orientation="vertical"
      />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <Fragment key={`${crumb.href}-${crumb.label}`}>
                {index > 0 ? (
                  <BreadcrumbSeparator className="hidden md:block" />
                ) : null}
                <BreadcrumbItem
                  className={isLast ? "min-w-0" : "hidden md:inline-flex"}
                >
                  {isLast ? (
                    <BreadcrumbPage className="truncate font-medium">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
    </header>
  );
}
