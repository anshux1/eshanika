import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { visibleNavGroups } from "@/components/shell/nav-items";
import { DashboardTiles } from "@/features/dashboard/components/dashboard-tiles";
import { BrowserHealthCheck } from "@/features/health/components/browser-health-check";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Overview | Eshanika Admin" };

const DESCRIPTIONS: Record<string, string> = {
  "/products": "Create products, set prices, and publish them to the store.",
  "/categories": "Arrange the category tree shoppers browse.",
  "/attributes": "Manage sizes, metals, colours, and their options.",
  "/tags": "Group products with tags for search and collections.",
  "/media": "Upload images and keep alt text up to date.",
  "/orders": "Confirm, pack, and ship orders, or cancel them.",
  "/customers": "Look up a customer's details, cart, and order history.",
  "/inventory": "Check stock for every variant and record changes.",
  "/inventory/movements": "See every stock change and export it as CSV.",
  "/team": "Change roles or suspend admin access.",
  "/team/invitations": "Invite new admins and manage pending links.",
  "/returns": "Move returned items from requested to restocked.",
  "/payments": "See Razorpay payments, refunds, and webhook events.",
  "/coupons": "Create discount codes and see who used them.",
  "/settings/shipping": "Set shipping zones, methods, and free-shipping rules.",
  "/settings/fees": "Turn the cash-on-delivery fee on or off.",
  "/content/pages": "Write and publish store pages.",
  "/content/menus": "Arrange the header and footer links.",
  "/content/footer": "Edit the text at the bottom of every page.",
  "/reports": "Sales, top products, customers, and coupon use.",
  "/carts": "See carts customers left behind.",
  "/activity": "Every change the team made, and who made it.",
};

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const { user, permissions } = await requireAdmin("/");
  const shortcuts = visibleNavGroups(permissions)
    .flatMap((group) => group.items)
    .filter((item) => item.href !== "/");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 sm:px-8 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
        />
        <p className="relative text-sm font-medium text-muted-foreground">
          {greeting()}
        </p>
        <h1 className="relative mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="relative mt-2 max-w-xl text-sm text-muted-foreground">
          Here's how the store is doing and what needs attention today.
        </p>
      </section>

      <DashboardTiles />

      {shortcuts.length > 0 ? (
        <section aria-labelledby="shortcuts-heading" className="space-y-3">
          <h2
            className="text-sm font-medium text-muted-foreground"
            id="shortcuts-heading"
          >
            Jump to
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  className="group flex h-full items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  href={item.href}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      {item.title}
                      <ArrowUpRight
                        aria-hidden
                        className="size-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                      />
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {DESCRIPTIONS[item.href]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">System status</h2>
        <BrowserHealthCheck />
      </section>
    </div>
  );
}
