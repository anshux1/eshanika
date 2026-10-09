"use client";

import type { PaymentEventProcessingStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { EVENT_STATUS, EventStatusBadge } from "./payment-badges";
import { PaymentsTabs } from "./payments-tabs";

export function PaymentEventsView() {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const rawStatus = url.get("status");
  const status =
    rawStatus && rawStatus in EVENT_STATUS
      ? (rawStatus as PaymentEventProcessingStatus)
      : undefined;
  const events = useQuery(
    orpc.payments.events.queryOptions({
      input: { status, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const retry = useMutation(
    orpc.payments.retryEvent.mutationOptions({
      onSuccess: (result) => {
        if (result.processingStatus === "failed") {
          toast.error("It failed again. The error is shown on the event.");
        } else {
          toast.success(
            `Event ${EVENT_STATUS[result.processingStatus].label.toLowerCase()}`,
          );
        }
      },
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.payments.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.orders.key() }),
        ]),
    }),
  );
  const items = events.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        description="Notifications Razorpay sent to the store. Each one is stored once, even when Razorpay sends it again."
        title="Payments"
      />
      <PaymentsTabs />
      <SimpleSelect
        aria-label="Filter by processing status"
        className="sm:w-48"
        onChange={(next) => url.set({ status: next === "all" ? null : next })}
        options={[
          { value: "all", label: "All events" },
          ...Object.entries(EVENT_STATUS).map(([value, badge]) => ({
            value,
            label: badge.label,
          })),
        ]}
        value={status ?? "all"}
      />
      {events.isPending ? (
        <LoadingState rows={6} />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            status
              ? "No event has this status."
              : "Point the Razorpay webhook at /api/webhooks/razorpay and events show up here."
          }
          title={status ? "No matches" : "No events yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4 md:w-auto">Event</TableHead>
                <TableHead className="hidden w-full md:table-cell">
                  Result
                </TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((event) => {
                const retrying =
                  retry.isPending && retry.variables?.id === event.id;
                return (
                  <TableRow key={event.id}>
                    <TableCell className="pl-4">
                      <span className="block font-mono text-sm whitespace-nowrap">
                        {event.eventType}
                      </span>
                      <span className="block text-xs text-muted-foreground sm:whitespace-nowrap">
                        {formatDateTime(event.receivedAt)}
                        {event.order ? (
                          <>
                            {" · "}
                            <Link
                              className="hover:underline hover:underline-offset-4"
                              href={`/orders/${event.order.id}#payment`}
                            >
                              {event.order.orderNumber}
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-0 md:table-cell">
                      <span className="block truncate text-sm">
                        {event.processingError ??
                          (event.processedAt
                            ? `Processed ${formatDateTime(event.processedAt)}`
                            : "Waiting to be processed")}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {event.attemptCount} attempt
                        {event.attemptCount === 1 ? "" : "s"}
                        {event.processingStatus === "failed"
                          ? ` · retry after ${formatDateTime(event.nextAttemptAt)}`
                          : ""}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <EventStatusBadge status={event.processingStatus} />
                        {event.processingStatus === "failed" ||
                        event.processingStatus === "pending" ? (
                          <Button
                            aria-label={`Retry ${event.eventType}`}
                            disabled={retry.isPending}
                            onClick={() => retry.mutate({ id: event.id })}
                            size="sm"
                            variant="outline"
                          >
                            {retrying ? (
                              <Loader2 aria-hidden className="animate-spin" />
                            ) : (
                              <RotateCw aria-hidden />
                            )}
                            Retry
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {events.data ? (
        <CursorPagination nextCursor={events.data.nextCursor} />
      ) : null}
    </div>
  );
}
