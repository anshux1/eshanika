"use client";

import { Skeleton } from "@eshanika/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/patterns/page-state";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";

function Tile({
  label,
  value,
  detail,
  href,
  attention,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href: string;
  // Attention tiles say so in words and with an icon, never by colour alone.
  attention?: boolean;
}) {
  return (
    <Link
      className="group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-ring/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      href={href}
    >
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {attention === undefined ? null : attention ? (
          <CircleAlert
            aria-hidden
            className="size-4 text-amber-600 dark:text-amber-400"
          />
        ) : (
          <CircleCheck
            aria-hidden
            className="size-4 text-emerald-600 dark:text-emerald-400"
          />
        )}
        {label}
      </span>
      <span className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      {detail ? (
        <span className="mt-1 text-xs text-muted-foreground">{detail}</span>
      ) : null}
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function DashboardTiles() {
  const summary = useQuery(orpc.dashboard.summary.queryOptions());

  if (summary.isPending) {
    return (
      <div
        aria-busy="true"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <span className="sr-only">Loading</span>
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton className="h-28 rounded-xl" key={key} />
        ))}
      </div>
    );
  }
  if (summary.isError) {
    return (
      <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
    );
  }
  const { sales, ordersToProcess, stock, payments } = summary.data;
  const toProcess = ordersToProcess
    ? ordersToProcess.created +
      ordersToProcess.confirmed +
      ordersToProcess.processing
    : 0;

  return (
    <div className="space-y-6">
      {sales && ordersToProcess ? (
        <Section title="Sales">
          <Tile
            detail={countLabel(sales.todayOrders, "order", "orders")}
            href="/orders"
            label="Today"
            value={formatInr(sales.todaySales)}
          />
          <Tile
            detail={countLabel(sales.weekOrders, "order", "orders")}
            href="/orders"
            label="Last 7 days"
            value={formatInr(sales.weekSales)}
          />
          <Tile
            attention={ordersToProcess.created > 0}
            detail={
              ordersToProcess.created > 0
                ? "Waiting for confirmation"
                : "All confirmed"
            }
            href="/orders?status=created"
            label="New orders"
            value={ordersToProcess.created}
          />
          <Tile
            attention={toProcess > 0}
            detail={`${ordersToProcess.confirmed} confirmed, ${ordersToProcess.processing} processing`}
            href={
              ordersToProcess.confirmed > 0
                ? "/orders?status=confirmed"
                : "/orders?status=processing"
            }
            label="To pack and ship"
            value={ordersToProcess.confirmed + ordersToProcess.processing}
          />
        </Section>
      ) : null}
      {stock || payments ? (
        <Section title="Needs attention">
          {stock ? (
            <>
              <Tile
                attention={stock.low > 0}
                detail="At or below the reorder point"
                href="/inventory?stock=low"
                label="Low stock"
                value={stock.low}
              />
              <Tile
                attention={stock.out > 0}
                detail="Can't be sold right now"
                href="/inventory?stock=out"
                label="Out of stock"
                value={stock.out}
              />
            </>
          ) : null}
          {payments ? (
            <>
              <Tile
                attention={payments.failedPayments > 0}
                detail="In the last 7 days"
                href="/payments?status=failed"
                label="Failed payments"
                value={payments.failedPayments}
              />
              <Tile
                attention={payments.pendingRefunds > 0}
                detail="Waiting for Razorpay to confirm"
                href="/payments"
                label="Pending refunds"
                value={payments.pendingRefunds}
              />
              <Tile
                attention={payments.failedEvents > 0}
                detail="Razorpay updates that need a retry"
                href="/payments/events?status=failed"
                label="Failed webhooks"
                value={payments.failedEvents}
              />
            </>
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}
