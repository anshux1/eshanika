"use client";

import type { ReturnStatus } from "@eshanika/database/enums";
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
import { SearchInput } from "@/components/patterns/search-input";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { RETURN_STATUS, ReturnStatusBadge } from "./return-badges";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...Object.entries(RETURN_STATUS).map(([value, badge]) => ({
    value,
    label: badge.label,
  })),
];

export function ReturnsView() {
  const url = useUrlState();
  const search = url.get("q");
  const rawStatus = url.get("status");
  const status =
    rawStatus && rawStatus in RETURN_STATUS
      ? (rawStatus as ReturnStatus)
      : undefined;
  const returns = useQuery(
    orpc.returns.list.queryOptions({
      input: { search, status, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = returns.data?.items ?? [];
  const filtered = Boolean(search || status);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Items customers are sending back, newest first. Open the order to move a return along."
        title="Returns"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          className="sm:w-80"
          placeholder="Search by order number or email"
        />
        <SimpleSelect
          aria-label="Filter by status"
          className="sm:w-48"
          onChange={(next) => url.set({ status: next === "all" ? null : next })}
          options={STATUS_OPTIONS}
          value={status ?? "all"}
        />
      </div>
      {returns.isPending ? (
        <LoadingState rows={6} />
      ) : returns.isError ? (
        <ErrorState error={returns.error} onRetry={() => returns.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            filtered
              ? "No return matches these filters."
              : "Create a return from a delivered order and it shows up here."
          }
          title={filtered ? "No matches" : "No returns yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Order</TableHead>
                <TableHead className="hidden w-full md:table-cell">
                  Items
                </TableHead>
                <TableHead className="hidden lg:table-cell">Customer</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((request) => {
                const units = request.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );
                return (
                  <TableRow key={request.id}>
                    <TableCell className="pl-4">
                      <Link
                        className="font-medium whitespace-nowrap hover:underline hover:underline-offset-4"
                        href={`/orders/${request.order.id}#returns`}
                      >
                        {request.order.orderNumber}
                      </Link>
                      <span className="block text-xs text-muted-foreground sm:whitespace-nowrap">
                        {formatDateTime(request.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-0 md:table-cell">
                      <span className="block truncate">
                        {request.items
                          .map(
                            (item) => `${item.quantity} × ${item.productName}`,
                          )
                          .join(", ")}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {units} unit{units === 1 ? "" : "s"} · {request.reason}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-48 lg:table-cell">
                      <span className="block truncate">
                        {request.order.user?.name ?? "Guest"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {request.order.billingEmail}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ReturnStatusBadge status={request.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {returns.data ? (
        <CursorPagination nextCursor={returns.data.nextCursor} />
      ) : null}
    </div>
  );
}
