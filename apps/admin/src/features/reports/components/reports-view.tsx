"use client";

import { Button } from "@eshanika/ui/components/button";
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
import { Download } from "lucide-react";
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
import { downloadCsv } from "@/lib/download-csv";
import { formatDate, toIstInputValue } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";

type Report = RouterOutputs["reports"]["sales"];

const DAY_MS = 24 * 60 * 60 * 1000;

// Without a range in the URL the report covers the last 30 India-time days.
function defaultRange() {
  const now = Date.now();
  return {
    from: toIstInputValue(new Date(now - 29 * DAY_MS).toISOString()).slice(
      0,
      10,
    ),
    to: toIstInputValue(new Date(now).toISOString()).slice(0, 10),
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(report: Report) {
  const header = [
    "Day",
    "Orders",
    "Gross",
    "Discounts",
    "Refunds",
    "Net",
    "Shipping",
    "Fees",
    "Tax",
    "Order total",
  ];
  const rows = report.daily.map((day) => [
    day.day,
    day.orders,
    day.gross,
    day.discounts,
    day.refunds,
    day.net,
    day.shipping,
    day.fees,
    day.tax,
    day.total,
  ]);
  const totals = report.totals;
  rows.push([
    "Total",
    totals.orders,
    totals.gross,
    totals.discounts,
    totals.refunds,
    totals.net,
    totals.shipping,
    totals.fees,
    totals.tax,
    totals.total,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ReportsView() {
  const range = useDateRange();
  const fallback = defaultRange();
  const from = range.from ?? fallback.from;
  const to = range.to ?? fallback.to;
  const report = useQuery({
    ...orpc.reports.sales.queryOptions({ input: { from, to } }),
    enabled: !range.reversed,
  });
  const data = report.data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={
          <Button
            disabled={!data}
            onClick={() =>
              data && downloadCsv(`sales-${from}-to-${to}.csv`, toCsv(data))
            }
            variant="outline"
          >
            <Download aria-hidden />
            Export CSV
          </Button>
        }
        description="Placed orders in India time, from what customers were charged. Cancelled orders are left out, and refunds count on the day they were processed."
        title="Reports"
      />
      <div className="sm:w-96">
        <DateRangeFilter />
        {range.from || range.to ? null : (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing the last 30 days, {formatDate(from)} to {formatDate(to)}.
          </p>
        )}
      </div>

      {range.reversed ? null : report.isPending ? (
        <LoadingState rows={6} />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : data && data.totals.orders === 0 && data.daily.length === 0 ? (
        <EmptyState
          description="No orders were placed and no refunds were processed in this range."
          title="Nothing in this range"
        />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Figure
              hint={`${data.totals.orders} orders`}
              label="Gross sales"
              value={formatInr(data.totals.gross)}
            />
            <Figure
              label="Discounts"
              value={formatInr(data.totals.discounts)}
            />
            <Figure label="Refunds" value={formatInr(data.totals.refunds)} />
            <Figure
              hint="Gross minus discounts and refunds"
              label="Net sales"
              value={formatInr(data.totals.net)}
            />
            <Figure label="Tax collected" value={formatInr(data.totals.tax)} />
            <Figure
              label="Shipping charged"
              value={formatInr(data.totals.shipping)}
            />
            <Figure
              label="New customers"
              value={String(data.customers.newCustomers)}
              hint="First order in this range"
            />
            <Figure
              label="Returning customers"
              value={String(data.customers.returningCustomers)}
              hint="Ordered before this range too"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
                <CardDescription>
                  By sales, from the order snapshot.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products sold.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-full">Product</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topProducts.map((product) => (
                        <TableRow key={product.name}>
                          <TableCell className="max-w-0 truncate">
                            {product.name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {product.units}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap tabular-nums">
                            {formatInr(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Coupon use</CardTitle>
                <CardDescription>
                  Orders placed with a coupon in this range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.coupons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No coupons used.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-full">Code</TableHead>
                        <TableHead className="text-right">Uses</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.coupons.map((coupon) => (
                        <TableRow key={coupon.code}>
                          <TableCell className="font-mono">
                            {coupon.code}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {coupon.uses}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap tabular-nums">
                            {formatInr(coupon.discount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>By day</CardTitle>
              <CardDescription>
                Only days with orders or refunds are listed.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Discounts</TableHead>
                    <TableHead className="text-right">Refunds</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.daily.map((day) => (
                    <TableRow key={day.day}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(day.day)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {day.orders}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatInr(day.gross)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatInr(day.discounts)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatInr(day.refunds)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatInr(day.net)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatInr(day.tax)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
