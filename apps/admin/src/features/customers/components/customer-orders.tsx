"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
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
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/features/orders/components/order-badges";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";

export function CustomerOrders({ customerId }: { customerId: string }) {
  const url = useUrlState();
  const orders = useQuery(
    orpc.customers.orders.queryOptions({
      input: { customerId, cursor: url.get("cursor"), limit: 10 },
    }),
  );
  const items = orders.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.isPending ? (
          <LoadingState rows={4} />
        ) : orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            description="Orders this customer places show up here."
            title="No orders yet"
          />
        ) : (
          <div className="-mx-4 overflow-hidden border-y sm:mx-0 sm:rounded-lg sm:border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-full pl-4">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Payment
                  </TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-4">
                      <Link
                        className="font-medium hover:underline hover:underline-offset-4"
                        href={`/orders/${order.id}`}
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap tabular-nums">
                      {formatInr(order.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {orders.data ? (
          <CursorPagination nextCursor={orders.data.nextCursor} />
        ) : null}
      </CardContent>
    </Card>
  );
}
