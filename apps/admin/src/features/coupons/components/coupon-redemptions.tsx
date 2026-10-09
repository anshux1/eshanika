"use client";

import {
  Card,
  CardContent,
  CardDescription,
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
import { ErrorState, LoadingState } from "@/components/patterns/page-state";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";

export function CouponRedemptions({ couponId }: { couponId: string }) {
  const url = useUrlState();
  const redemptions = useQuery(
    orpc.coupons.redemptions.queryOptions({
      input: { couponId, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = redemptions.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage history</CardTitle>
        <CardDescription>Orders that used this coupon.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {redemptions.isPending ? (
          <LoadingState rows={3} />
        ) : redemptions.isError ? (
          <ErrorState
            error={redemptions.error}
            onRetry={() => redemptions.refetch()}
          />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No one has used this coupon yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-3">Order</TableHead>
                  <TableHead className="hidden w-full sm:table-cell">
                    Customer
                  </TableHead>
                  <TableHead className="pr-3 text-right">Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell className="pl-3">
                      <Link
                        className="font-medium whitespace-nowrap hover:underline hover:underline-offset-4"
                        href={`/orders/${redemption.order.id}`}
                      >
                        {redemption.order.orderNumber}
                      </Link>
                      <span className="block text-xs text-muted-foreground sm:whitespace-nowrap">
                        {formatDateTime(redemption.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-0 sm:table-cell">
                      <Link
                        className="block truncate hover:underline hover:underline-offset-4"
                        href={`/customers/${redemption.user.id}`}
                      >
                        {redemption.user.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {redemption.user.email}
                      </span>
                    </TableCell>
                    <TableCell className="pr-3 text-right whitespace-nowrap tabular-nums">
                      {formatInr(redemption.discountAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {redemptions.data ? (
          <CursorPagination nextCursor={redemptions.data.nextCursor} />
        ) : null}
      </CardContent>
    </Card>
  );
}
