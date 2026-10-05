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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@eshanika/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { History, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { FilterTabs } from "@/components/patterns/filter-tabs";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/patterns/page-state";
import { useUrlState } from "@/hooks/use-url-state";
import { orpc } from "@/orpc/query";
import { AdjustStockDialog, type StockRow } from "./adjust-stock-dialog";
import { StockLevelBadge } from "./stock-level-badge";

const STOCK_FILTERS = ["all", "low", "out"] as const;
type StockFilter = (typeof STOCK_FILTERS)[number];

export function InventoryView() {
  const url = useUrlState();
  const stockParam = url.get("stock");
  const stock: StockFilter = STOCK_FILTERS.includes(stockParam as StockFilter)
    ? (stockParam as StockFilter)
    : "all";
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);

  const inventory = useQuery(
    orpc.inventory.list.queryOptions({
      input: { stock, cursor: url.get("cursor"), limit: 25 },
    }),
  );
  const items = inventory.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={
          <Button
            nativeButton={false}
            render={
              <Link href="/inventory/movements">
                <History aria-hidden />
                Movements
              </Link>
            }
            variant="outline"
          />
        }
        description="Stock for every variant that tracks inventory. Available is on hand minus what open orders have reserved."
        title="Stock levels"
      />
      <FilterTabs
        label="Filter by stock"
        options={[
          { value: "all", label: "All" },
          { value: "low", label: "Low stock" },
          { value: "out", label: "Out of stock" },
        ]}
        param="stock"
      />

      {inventory.isPending ? (
        <LoadingState rows={8} />
      ) : inventory.isError ? (
        <ErrorState
          error={inventory.error}
          onRetry={() => inventory.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          description={
            stock === "all"
              ? "Turn on stock tracking for a product variant to manage it here."
              : stock === "low"
                ? "Nothing is at or below its reorder point."
                : "Every tracked variant has stock available."
          }
          title={
            stock === "all"
              ? "No tracked variants"
              : stock === "low"
                ? "No low stock"
                : "Nothing is out of stock"
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full pl-4">Variant</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  On hand
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Reserved
                </TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Reorder at
                </TableHead>
                <TableHead className="w-0 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-0 pl-4">
                    <Link
                      className="block truncate font-medium hover:underline hover:underline-offset-4"
                      href={`/products/${row.productId}`}
                    >
                      {row.productName}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.name === row.productName
                        ? row.sku
                        : `${row.name} · ${row.sku}`}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StockLevelBadge
                      available={row.available}
                      reorderPoint={row.reorderPoint}
                    />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {row.quantityOnHand}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                    {row.quantityReserved}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {row.available}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                    {row.reorderPoint}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              aria-label={`Stock history for ${row.sku}`}
                              nativeButton={false}
                              render={
                                <Link
                                  href={`/inventory/movements?variantId=${row.id}`}
                                />
                              }
                              size="icon-sm"
                              variant="ghost"
                            />
                          }
                        >
                          <History aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent>History</TooltipContent>
                      </Tooltip>
                      <Button
                        onClick={() => setAdjusting(row)}
                        size="sm"
                        variant="outline"
                      >
                        <SlidersHorizontal aria-hidden />
                        <span className="sr-only sm:not-sr-only">Adjust</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {inventory.data ? (
        <CursorPagination nextCursor={inventory.data.nextCursor} />
      ) : null}

      <AdjustStockDialog
        onOpenChange={(open) => {
          if (!open) setAdjusting(null);
        }}
        row={adjusting}
      />
    </div>
  );
}
