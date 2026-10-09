"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";

export function CartsView() {
  const url = useUrlState();
  const carts = useQuery(
    orpc.reports.abandonedCarts.queryOptions({
      input: { cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = carts.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Carts customers left without checking out, most recent activity first. Values use today's prices."
        title="Abandoned carts"
      />
      {carts.isPending ? (
        <LoadingState rows={6} />
      ) : carts.isError ? (
        <ErrorState error={carts.error} onRetry={() => carts.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description="Carts left behind by signed-in customers show up here."
          title="No abandoned carts"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead className="hidden w-full md:table-cell">
                  Items
                </TableHead>
                <TableHead className="pr-4 text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cart) => {
                const units = cart.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );
                return (
                  <TableRow key={cart.id}>
                    <TableCell className="max-w-56 pl-4">
                      <Link
                        className="block truncate font-medium hover:underline hover:underline-offset-4"
                        href={`/customers/${cart.customer.id}`}
                      >
                        {cart.customer.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {cart.customer.email}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Last active {formatDateTime(cart.lastActivityAt)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-0 md:table-cell">
                      <span className="block truncate">
                        {cart.items
                          .map(
                            (item) =>
                              `${item.quantity} × ${item.productName}${item.variantName && item.variantName !== item.productName ? ` (${item.variantName})` : ""}`,
                          )
                          .join(", ")}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {units} unit{units === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap tabular-nums">
                      {formatInr(cart.valueAtCurrentPrices)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {carts.data ? (
        <CursorPagination nextCursor={carts.data.nextCursor} />
      ) : null}
    </div>
  );
}
