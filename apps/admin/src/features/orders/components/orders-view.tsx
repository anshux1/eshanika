"use client";

import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from "@eshanika/database/enums";
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
import {
  DateRangeFilter,
  useDateRange,
} from "@/components/patterns/date-range-filter";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime, istDayEnd, istDayStart } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";
import {
  FULFILMENT_STATUS,
  FulfilmentStatusBadge,
  ORDER_STATUS,
  OrderStatusBadge,
  PAYMENT_STATUS,
  PaymentStatusBadge,
} from "./order-badges";

// Ignores values that aren't in the list, such as a hand-edited URL.
function pick<T extends string>(
  value: string | undefined,
  allowed: Record<T, unknown>,
) {
  return value && value in allowed ? (value as T) : undefined;
}

function filterOptions(all: string, labels: Record<string, { label: string }>) {
  return [
    { value: "all", label: all },
    ...Object.entries(labels).map(([value, badge]) => ({
      value,
      label: badge.label,
    })),
  ];
}

export function OrdersView() {
  const url = useUrlState();
  const search = url.get("q");
  const status = pick<OrderStatus>(url.get("status"), ORDER_STATUS);
  const paymentStatus = pick<OrderPaymentStatus>(
    url.get("payment"),
    PAYMENT_STATUS,
  );
  const fulfillmentStatus = pick<OrderFulfillmentStatus>(
    url.get("fulfilment"),
    FULFILMENT_STATUS,
  );
  const { from, to, reversed } = useDateRange();

  const orders = useQuery({
    ...orpc.orders.list.queryOptions({
      input: {
        search,
        status,
        paymentStatus,
        fulfillmentStatus,
        from: from ? istDayStart(from) : undefined,
        to: to ? istDayEnd(to) : undefined,
        cursor: url.get("cursor"),
        limit: 25,
      },
    }),
    enabled: !reversed,
  });
  const items = orders.data?.items ?? [];
  const filtered = Boolean(
    search || status || paymentStatus || fulfillmentStatus || from || to,
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Every order placed in the store, newest first."
        title="Orders"
      />
      <div className="space-y-3">
        <SearchInput
          className="sm:w-80"
          placeholder="Search by order number or email"
        />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,20rem)] lg:items-end">
          <SimpleSelect
            aria-label="Filter by order status"
            onChange={(next) =>
              url.set({ status: next === "all" ? null : next })
            }
            options={filterOptions("All statuses", ORDER_STATUS)}
            value={status ?? "all"}
          />
          <SimpleSelect
            aria-label="Filter by payment"
            onChange={(next) =>
              url.set({ payment: next === "all" ? null : next })
            }
            options={filterOptions("All payments", PAYMENT_STATUS)}
            value={paymentStatus ?? "all"}
          />
          <SimpleSelect
            aria-label="Filter by fulfilment"
            onChange={(next) =>
              url.set({ fulfilment: next === "all" ? null : next })
            }
            options={filterOptions("All fulfilment", FULFILMENT_STATUS)}
            value={fulfillmentStatus ?? "all"}
          />
          <div className="sm:col-span-3 lg:col-span-1">
            <DateRangeFilter />
          </div>
        </div>
      </div>

      {reversed ? null : orders.isPending ? (
        <LoadingState rows={8} />
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            filtered
              ? "No order matches these filters."
              : "Orders placed in the store show up here."
          }
          title={filtered ? "No matches" : "No orders yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4 lg:w-auto">Order</TableHead>
                <TableHead className="hidden w-full lg:table-cell">
                  Customer
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Payment</TableHead>
                <TableHead className="hidden xl:table-cell">
                  Fulfilment
                </TableHead>
                <TableHead className="pr-4 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="pl-4">
                    <Link
                      className="font-medium whitespace-nowrap hover:underline hover:underline-offset-4"
                      href={`/orders/${order.id}`}
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="block text-xs text-muted-foreground sm:whitespace-nowrap">
                      {formatDateTime(order.placedAt ?? order.createdAt)}
                    </span>
                    <span className="mt-1 block sm:hidden">
                      <OrderStatusBadge status={order.status} />
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-0 lg:table-cell">
                    <span className="block truncate">
                      {order.user?.name ?? "Guest"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.billingEmail}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <FulfilmentStatusBadge status={order.fulfillmentStatus} />
                  </TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    <span className="tabular-nums">
                      {formatInr(order.totalAmount)}
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {order._count.orderItems} product
                      {order._count.orderItems === 1 ? "" : "s"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {orders.data && !reversed ? (
        <CursorPagination nextCursor={orders.data.nextCursor} />
      ) : null}
    </div>
  );
}
