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
import { SearchInput } from "@/components/patterns/search-input";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../schema";
import {
  formatPaise,
  PAYMENT_ATTEMPT_STATUS,
  PAYMENT_METHOD_LABELS,
  PaymentAttemptBadge,
} from "./payment-badges";
import { PaymentsTabs } from "./payments-tabs";

function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
) {
  return allowed.find((entry) => entry === value);
}

export function PaymentsView() {
  const url = useUrlState();
  const search = url.get("q");
  const status = pick(url.get("status"), PAYMENT_STATUSES);
  const method = pick(url.get("method"), PAYMENT_METHODS);
  const payments = useQuery(
    orpc.payments.list.queryOptions({
      input: { search, status, method, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = payments.data?.items ?? [];
  const filtered = Boolean(search || status || method);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Every Razorpay payment attempt, newest first."
        title="Payments"
      />
      <PaymentsTabs />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          className="sm:w-80"
          placeholder="Search by order number or payment ID"
        />
        <SimpleSelect
          aria-label="Filter by status"
          className="sm:w-44"
          onChange={(next) => url.set({ status: next === "all" ? null : next })}
          options={[
            { value: "all", label: "All statuses" },
            ...PAYMENT_STATUSES.map((value) => ({
              value,
              label: PAYMENT_ATTEMPT_STATUS[value]?.label ?? value,
            })),
          ]}
          value={status ?? "all"}
        />
        <SimpleSelect
          aria-label="Filter by method"
          className="sm:w-44"
          onChange={(next) => url.set({ method: next === "all" ? null : next })}
          options={[
            { value: "all", label: "All methods" },
            ...PAYMENT_METHODS.map((value) => ({
              value,
              label: PAYMENT_METHOD_LABELS[value] ?? value,
            })),
          ]}
          value={method ?? "all"}
        />
      </div>
      {payments.isPending ? (
        <LoadingState rows={6} />
      ) : payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            filtered
              ? "No payment matches these filters."
              : "Payments show up here once customers pay at checkout."
          }
          title={filtered ? "No matches" : "No payments yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Order</TableHead>
                <TableHead className="hidden w-full md:table-cell">
                  Payment
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="pl-4">
                    <Link
                      className="font-medium whitespace-nowrap hover:underline hover:underline-offset-4"
                      href={`/orders/${payment.order.id}#payment`}
                    >
                      {payment.order.orderNumber}
                    </Link>
                    <span className="block text-xs text-muted-foreground sm:whitespace-nowrap">
                      {formatDateTime(payment.capturedAt ?? payment.createdAt)}
                    </span>
                    <span className="mt-1 block sm:hidden">
                      <PaymentAttemptBadge status={payment.status} />
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-0 md:table-cell">
                    <span className="block truncate font-mono text-xs">
                      {payment.providerPaymentId}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {payment.paymentMethod
                        ? (PAYMENT_METHOD_LABELS[payment.paymentMethod] ??
                          payment.paymentMethod)
                        : "Method unknown"}
                      {payment.errorDescription
                        ? ` · ${payment.errorDescription}`
                        : ""}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <PaymentAttemptBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap tabular-nums">
                    {formatPaise(payment.amountMinor)}
                    {payment.amountRefundedMinor !== "0" ? (
                      <span className="block text-xs text-muted-foreground">
                        {formatPaise(payment.amountRefundedMinor)} refunded
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {payments.data ? (
        <CursorPagination nextCursor={payments.data.nextCursor} />
      ) : null}
    </div>
  );
}
