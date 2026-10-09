"use client";

import type { InventoryMovementReason } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import {
  DateRangeFilter,
  useDateRange,
} from "@/components/patterns/date-range-filter";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/patterns/status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { downloadCsv } from "@/lib/download-csv";
import { formatDateTime, istDayEnd, istDayStart } from "@/lib/format";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";
import { REASON_LABELS } from "./movement-reasons";
import { VariantFilter } from "./variant-filter";

const REASON_TONES: Record<InventoryMovementReason, StatusTone> = {
  initial_stock: "neutral",
  restock: "success",
  sale: "info",
  return: "info",
  cancellation: "muted",
  adjustment: "neutral",
  damage: "danger",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function MovementsView() {
  const url = useUrlState();
  const variantParam = url.get("variantId");
  const variantId =
    variantParam && UUID.test(variantParam) ? variantParam : undefined;
  const reasonParam = url.get("reason");
  const reason =
    reasonParam && reasonParam in REASON_LABELS
      ? (reasonParam as InventoryMovementReason)
      : undefined;
  const { from, to, reversed } = useDateRange();
  const filters = {
    variantId,
    reason,
    from: from ? istDayStart(from) : undefined,
    to: to ? istDayEnd(to) : undefined,
  };

  const movements = useQuery({
    ...orpc.inventory.movements.queryOptions({
      input: { ...filters, cursor: url.get("cursor"), limit: 25 },
    }),
    enabled: !reversed,
  });
  const exportCsv = useMutation({
    mutationFn: () => client.inventory.exportMovements(filters),
    onSuccess: (file) => downloadCsv(file.fileName, file.content),
    onError: (error) => toast.error(errorMessage(error)),
  });
  const items = movements.data?.items ?? [];
  const filtered = Boolean(variantId || reason || from || to);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={
          <Button
            disabled={reversed || exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
            variant="outline"
          >
            {exportCsv.isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Download aria-hidden />
            )}
            Export CSV
          </Button>
        }
        description="Every change to stock, newest first. Entries are never edited. The export uses the filters below."
        title="Stock movements"
      />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_minmax(0,20rem)] md:items-end">
        <VariantFilter
          onChange={(next) => url.set({ variantId: next })}
          value={variantId}
        />
        <SimpleSelect
          aria-label="Filter by reason"
          onChange={(next) => url.set({ reason: next === "all" ? null : next })}
          options={[
            { value: "all", label: "All reasons" },
            ...Object.entries(REASON_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={reason ?? "all"}
        />
        <DateRangeFilter />
      </div>

      {reversed ? null : movements.isPending ? (
        <LoadingState rows={8} />
      ) : movements.isError ? (
        <ErrorState
          error={movements.error}
          onRetry={() => movements.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            filtered
              ? "No stock change matches these filters."
              : "Stock changes appear here once you adjust stock or ship an order."
          }
          title={filtered ? "No matches" : "No movements yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4">Variant</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  On hand after
                </TableHead>
                <TableHead className="hidden md:table-cell">By</TableHead>
                <TableHead className="hidden pr-4 lg:table-cell">
                  When
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="max-w-0 pl-4">
                    <span className="block truncate font-medium">
                      {movement.variant.product.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {movement.variant.sku}
                      <span className="lg:hidden">
                        {" · "}
                        {formatDateTime(movement.createdAt)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <StatusBadge tone={REASON_TONES[movement.reason]}>
                      {REASON_LABELS[movement.reason]}
                    </StatusBadge>
                    {movement.referenceType === "Order" &&
                    movement.referenceId ? (
                      <Link
                        className="mt-1 block text-xs text-muted-foreground underline-offset-4 hover:underline"
                        href={`/orders/${movement.referenceId}`}
                      >
                        View order
                      </Link>
                    ) : null}
                    {movement.note ? (
                      <span
                        className="mt-1 hidden truncate text-xs text-muted-foreground sm:block"
                        title={movement.note}
                      >
                        {movement.note}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      movement.quantityDelta > 0 &&
                        "text-emerald-700 dark:text-emerald-400",
                      movement.quantityDelta < 0 && "text-destructive",
                    )}
                  >
                    {movement.quantityDelta > 0
                      ? `+${movement.quantityDelta}`
                      : movement.quantityDelta}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {movement.quantityAfter}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {movement.actorUser?.name ?? "System"}
                  </TableCell>
                  <TableCell className="hidden pr-4 whitespace-nowrap text-muted-foreground lg:table-cell">
                    {formatDateTime(movement.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {movements.data && !reversed ? (
        <CursorPagination nextCursor={movements.data.nextCursor} />
      ) : null}
    </div>
  );
}
