"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { FilterTabs } from "@/components/patterns/filter-tabs";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { formatInr, rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import { COUPON_STATES } from "../schema";
import { CouponStateBadge, discountLabel } from "./coupon-badges";

const STATE_LABELS = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  archived: "Archived",
} as const;

const EMPTY_COPY = {
  active: "No coupon is live right now.",
  scheduled: "No coupon is waiting to start.",
  expired: "No coupon has expired yet.",
  archived: "Archived coupons show up here.",
} as const;

export function CouponsView() {
  const url = useUrlState();
  const search = url.get("q");
  const state =
    COUPON_STATES.find((value) => value === url.get("state")) ?? "active";
  const coupons = useQuery(
    orpc.coupons.list.queryOptions({
      input: { state, search, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = coupons.data?.items ?? [];
  const newButton = (
    <Button
      nativeButton={false}
      render={
        <Link href="/coupons/new">
          <Plus aria-hidden />
          New coupon
        </Link>
      }
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={newButton}
        description="Discount codes customers enter at checkout."
        title="Coupons"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Coupon state"
          options={COUPON_STATES.map((value) => ({
            value,
            label: STATE_LABELS[value],
          }))}
          param="state"
        />
        <SearchInput className="sm:w-64" placeholder="Search by code" />
      </div>
      {coupons.isPending ? (
        <LoadingState rows={6} />
      ) : coupons.isError ? (
        <ErrorState error={coupons.error} onRetry={() => coupons.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          action={state === "active" && !search ? newButton : undefined}
          description={search ? "No coupon code matches." : EMPTY_COPY[state]}
          title={search ? "No matches" : "No coupons here"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4 md:w-auto">Code</TableHead>
                <TableHead className="hidden w-full md:table-cell">
                  Discount
                </TableHead>
                <TableHead className="hidden lg:table-cell">Dates</TableHead>
                <TableHead className="hidden sm:table-cell">Used</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="pl-4">
                    <Link
                      className="font-mono font-medium whitespace-nowrap hover:underline hover:underline-offset-4"
                      href={`/coupons/${coupon.id}`}
                    >
                      {coupon.code}
                    </Link>
                    <span className="block text-xs text-muted-foreground md:hidden">
                      {discountLabel(coupon)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-0 md:table-cell">
                    <span className="block truncate">
                      {discountLabel(coupon)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {rupeesToPaise(coupon.minimumSubtotal) > 0
                        ? `Orders over ${formatInr(coupon.minimumSubtotal)}`
                        : "Any order"}
                      {coupon.freeShipping ? " · Free shipping" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground lg:table-cell">
                    {formatDate(coupon.startsAt)} to{" "}
                    {coupon.expiresAt ? formatDate(coupon.expiresAt) : "no end"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap tabular-nums sm:table-cell">
                    {coupon.redemptionCount}
                    {coupon.usageLimit !== null
                      ? ` / ${coupon.usageLimit}`
                      : ""}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <CouponStateBadge coupon={coupon} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {coupons.data ? (
        <CursorPagination nextCursor={coupons.data.nextCursor} />
      ) : null}
    </div>
  );
}
