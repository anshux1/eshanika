"use client";

import type { ProductStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import { Checkbox } from "@eshanika/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Package, Plus, Rocket, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { CursorPagination } from "@/components/patterns/cursor-pagination";
import { FilterTabs } from "@/components/patterns/filter-tabs";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { SearchInput } from "@/components/patterns/search-input";
import { SimpleSelect } from "@/components/patterns/simple-select";
import {
  useAllCategories,
  useAllTags,
} from "@/features/catalog/taxonomy/hooks/use-taxonomy-lists";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { formatInr } from "@/lib/money";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { ProductStatusBadge } from "./product-status-badge";

type Product = RouterOutputs["catalog"]["products"]["list"]["items"][number];

const SORTS = [
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A to Z" },
  { value: "name:desc", label: "Name Z to A" },
  { value: "status:asc", label: "Status" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];
type BulkAction = "publish" | "archive";

function Price({ product }: { product: Product }) {
  const active = product.variants.filter(
    (variant) => variant.status === "active",
  );
  const variant = active.find((item) => item.isDefault) ?? active[0];
  if (!variant) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap tabular-nums">
      {variant.salePrice ? (
        <>
          {formatInr(variant.salePrice)}{" "}
          <s className="text-xs text-muted-foreground">
            {formatInr(variant.regularPrice)}
          </s>
        </>
      ) : (
        formatInr(variant.regularPrice)
      )}
    </span>
  );
}

export function ProductsView() {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const status = url.get("status") as ProductStatus | undefined;
  const categoryId = url.get("categoryId");
  const tagId = url.get("tagId");
  const search = url.get("q");
  const sort = (url.get("sort") ?? "updatedAt:desc") as SortValue;
  const [sortBy, sortDirection] = sort.split(":") as [
    "name" | "createdAt" | "updatedAt" | "status",
    "asc" | "desc",
  ];
  const categories = useAllCategories("active");
  const tags = useAllTags();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<BulkAction | null>(null);

  const products = useQuery(
    orpc.catalog.products.list.queryOptions({
      input: {
        cursor: url.get("cursor"),
        limit: 25,
        search,
        status,
        categoryId,
        tagId,
        sortBy,
        sortDirection,
      },
    }),
  );
  const items = products.data?.items ?? [];
  const pageKey = items.map((item) => item.id).join();

  // Selection only covers the rows on screen.
  useEffect(() => {
    setSelected((current) =>
      current.filter((id) => pageKey.split(",").includes(id)),
    );
  }, [pageKey]);

  const bulkStatus = useMutation(
    orpc.catalog.products.bulkStatus.mutationOptions({
      onSuccess: (result) => {
        const verb = result.status === "active" ? "published" : "archived";
        toast.success(
          result.updatedCount === 0
            ? `Nothing to change. The products were already ${verb}.`
            : `${result.updatedCount} product${result.updatedCount === 1 ? "" : "s"} ${verb}`,
        );
        setSelected([]);
        setBulk(null);
      },
      onError: (error) => {
        toast.error(errorMessage(error), { duration: 8000 });
        setBulk(null);
      },
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.catalog.products.key(),
        }),
    }),
  );

  const filtered = Boolean(search || status || categoryId || tagId);
  const allSelected = items.length > 0 && selected.length === items.length;

  const newButton = (
    <Button
      nativeButton={false}
      render={
        <Link href="/products/new">
          <Plus aria-hidden />
          New product
        </Link>
      }
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={newButton}
        description="Everything in the catalogue, from drafts to live pieces."
        title="Products"
      />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <FilterTabs
            label="Filter by status"
            options={[
              { value: "all", label: "All" },
              { value: "draft", label: "Drafts" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
            param="status"
          />
          <SearchInput className="md:w-64" placeholder="Search products" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SimpleSelect
            aria-label="Filter by category"
            onChange={(value) =>
              url.set({ categoryId: value === "all" ? null : value })
            }
            options={[
              { value: "all", label: "All categories" },
              ...(categories.data?.items ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
            value={categoryId ?? "all"}
          />
          <SimpleSelect
            aria-label="Filter by tag"
            onChange={(value) =>
              url.set({ tagId: value === "all" ? null : value })
            }
            options={[
              { value: "all", label: "All tags" },
              ...(tags.data?.items ?? []).map((tag) => ({
                value: tag.id,
                label: tag.name,
              })),
            ]}
            value={tagId ?? "all"}
          />
          <SimpleSelect
            aria-label="Sort products"
            onChange={(value) =>
              url.set({ sort: value === "updatedAt:desc" ? null : value })
            }
            options={[...SORTS]}
            value={sort}
          />
        </div>
      </div>

      {products.isPending ? (
        <LoadingState rows={8} />
      ) : products.isError ? (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          action={filtered ? undefined : newButton}
          description={
            filtered
              ? "No product matches these filters."
              : "Create your first product to start selling."
          }
          title={filtered ? "No matches" : "No products yet"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    aria-label="Select all products on this page"
                    checked={allSelected}
                    indeterminate={selected.length > 0 && !allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(checked ? items.map((item) => item.id) : [])
                    }
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Price</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Categories
                </TableHead>
                <TableHead className="hidden pr-4 lg:table-cell">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => {
                const isSelected = selected.includes(product.id);
                const variantCount = product.variants.filter(
                  (variant) => variant.status === "active",
                ).length;
                return (
                  <TableRow
                    data-state={isSelected ? "selected" : undefined}
                    key={product.id}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        aria-label={`Select ${product.name}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          setSelected((current) =>
                            checked
                              ? [...current, product.id]
                              : current.filter((id) => id !== product.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        className="group flex min-w-0 items-center gap-3"
                        href={`/products/${product.id}`}
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground",
                            product.primaryMedia.length > 0 &&
                              "bg-primary/10 text-primary",
                          )}
                        >
                          <Package aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:underline group-hover:underline-offset-4">
                            {product.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {product.productType === "variable"
                              ? `${variantCount} variant${variantCount === 1 ? "" : "s"}`
                              : (product.variants[0]?.sku ?? "No SKU")}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ProductStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Price product={product} />
                    </TableCell>
                    <TableCell className="hidden max-w-48 truncate text-muted-foreground lg:table-cell">
                      {product.categories.map((item) => item.name).join(", ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="hidden pr-4 text-muted-foreground lg:table-cell">
                      {formatDate(product.updatedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {products.data ? (
        <CursorPagination nextCursor={products.data.nextCursor} />
      ) : null}

      <div
        aria-hidden={selected.length === 0}
        className={cn(
          "sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border bg-background/95 py-1.5 pr-1.5 pl-4 shadow-lg backdrop-blur-md transition-all",
          selected.length === 0 &&
            "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <span className="text-sm font-medium tabular-nums">
          {selected.length} selected
        </span>
        <Button
          className="rounded-full"
          onClick={() => setBulk("publish")}
          size="sm"
          tabIndex={selected.length === 0 ? -1 : undefined}
        >
          <Rocket aria-hidden />
          Publish
        </Button>
        <Button
          className="rounded-full"
          onClick={() => setBulk("archive")}
          size="sm"
          tabIndex={selected.length === 0 ? -1 : undefined}
          variant="outline"
        >
          <Archive aria-hidden />
          Archive
        </Button>
        <Button
          aria-label="Clear selection"
          className="rounded-full"
          onClick={() => setSelected([])}
          size="icon-sm"
          tabIndex={selected.length === 0 ? -1 : undefined}
          variant="ghost"
        >
          <X aria-hidden />
        </Button>
      </div>

      <ConfirmDialog
        confirmLabel={bulk === "publish" ? "Publish" : "Archive"}
        description={
          bulk === "publish"
            ? "Each product must have a priced default variant and a primary image with alt text. If any product isn't ready, nothing changes."
            : "They're removed from the store. You can restore them to draft later."
        }
        destructive={bulk === "archive"}
        onConfirm={() => {
          if (bulk) bulkStatus.mutate({ ids: selected, action: bulk });
        }}
        onOpenChange={(open) => {
          if (!open) setBulk(null);
        }}
        open={bulk !== null}
        pending={bulkStatus.isPending}
        title={`${bulk === "publish" ? "Publish" : "Archive"} ${selected.length} product${selected.length === 1 ? "" : "s"}?`}
      />
    </div>
  );
}
