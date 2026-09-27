"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eshanika/ui/components/table";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CornerDownRight,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { FilterTabs } from "@/components/patterns/filter-tabs";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { ReorderButtons } from "@/components/patterns/reorder-buttons";
import { SearchInput } from "@/components/patterns/search-input";
import { StatusBadge } from "@/components/patterns/status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { orpc } from "@/orpc/query";
import { useAllCategories } from "../hooks/use-taxonomy-lists";
import { CategoryDialog, type CategoryDialogState } from "./category-dialog";
import {
  buildCategoryTree,
  type CategoryNode,
  filterTree,
  flattenTree,
  MAX_CATEGORY_DEPTH,
} from "./category-tree";

function ProductCount({ id, count }: { id: string; count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground">0</span>;
  }
  return (
    <Link
      className="font-medium underline-offset-4 hover:underline"
      href={`/products?categoryId=${id}`}
    >
      {count}
    </Link>
  );
}

export function CategoriesView() {
  const url = useUrlState();
  const status = url.get("status") === "archived" ? "archived" : "active";
  const query = url.get("q") ?? "";
  const queryClient = useQueryClient();
  const categories = useAllCategories(status);
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null);
  const [archiving, setArchiving] = useState<CategoryNode | null>(null);

  const tree = useMemo(
    () => buildCategoryTree(categories.data?.items ?? []),
    [categories.data],
  );
  const visible = useMemo(
    () => flattenTree(query ? filterTree(tree, query) : tree),
    [tree, query],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.catalog.categories.key() });
  const reorder = useMutation(
    orpc.catalog.categories.reorder.mutationOptions({
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: refresh,
    }),
  );
  const archive = useMutation(
    orpc.catalog.categories.archive.mutationOptions({
      onSuccess: (category) => {
        toast.success(`${category.name} archived`);
        setArchiving(null);
      },
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: refresh,
    }),
  );

  function siblingsOf(node: CategoryNode) {
    if (!node.parentId) return tree;
    return (
      flattenTree(tree).find((item) => item.id === node.parentId)?.children ??
      []
    );
  }

  function move(node: CategoryNode, index: number, offset: -1 | 1) {
    reorder.mutate({
      id: node.id,
      sortOrder: index + offset,
      expectedUpdatedAt: node.updatedAt,
    });
  }

  const newButton = (
    <Button onClick={() => setDialog({ mode: "create", parentId: null })}>
      <Plus aria-hidden />
      New category
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={newButton}
        description="Organise the store into categories and subcategories."
        title="Categories"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filter by status"
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          param="status"
        />
        <SearchInput placeholder="Search categories" />
      </div>

      {categories.isPending ? (
        <LoadingState rows={6} />
      ) : categories.isError ? (
        <ErrorState
          error={categories.error}
          onRetry={() => categories.refetch()}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          action={!query && status === "active" ? newButton : undefined}
          description={
            query
              ? "No category matches that search."
              : status === "archived"
                ? "Archived categories show up here."
                : "Create the first category to start organising products."
          }
          title={query ? "No matches" : "No categories"}
        />
      ) : status === "archived" ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="pr-4 text-right">Archived</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((node) => (
                <TableRow key={node.id}>
                  <TableCell className="pl-4 font-medium">
                    {node.name} <StatusBadge tone="muted">Archived</StatusBadge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {node.slug}
                  </TableCell>
                  <TableCell>
                    <ProductCount count={node.productCount} id={node.id} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">
                    {formatDate(node.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden lg:table-cell">Slug</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="w-32 pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((node) => {
                const siblings = siblingsOf(node);
                const index = siblings.findIndex((item) => item.id === node.id);
                return (
                  <TableRow key={node.id}>
                    <TableCell className="pl-4">
                      <div
                        className={cn(
                          "flex min-w-0 items-center gap-2",
                          node.depth === 2 && "pl-6",
                          node.depth >= 3 && "pl-12",
                        )}
                      >
                        {node.depth > 1 ? (
                          <CornerDownRight
                            aria-hidden
                            className="size-3.5 shrink-0 text-muted-foreground/70"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{node.name}</p>
                          {node.childCount > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {node.childCount}{" "}
                              {node.childCount === 1
                                ? "subcategory"
                                : "subcategories"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {node.slug}
                    </TableCell>
                    <TableCell>
                      <ProductCount count={node.productCount} id={node.id} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-0.5">
                        {query ? null : (
                          <ReorderButtons
                            count={siblings.length}
                            disabled={reorder.isPending}
                            index={index}
                            label={node.name}
                            onMove={(offset) => move(node, index, offset)}
                          />
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                aria-label={`Actions for ${node.name}`}
                                size="icon-sm"
                                variant="ghost"
                              />
                            }
                          >
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() =>
                                setDialog({ mode: "edit", category: node })
                              }
                            >
                              <Pencil aria-hidden />
                              Edit or move
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={node.depth >= MAX_CATEGORY_DEPTH}
                              onClick={() =>
                                setDialog({ mode: "create", parentId: node.id })
                              }
                            >
                              <FolderPlus aria-hidden />
                              Add subcategory
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setArchiving(node)}
                              variant="destructive"
                            >
                              <Archive aria-hidden />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {dialog ? (
        <CategoryDialog
          key={dialog.mode === "edit" ? dialog.category.id : "new"}
          onClose={() => setDialog(null)}
          state={dialog}
          tree={tree}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Archive"
        description={
          archiving && archiving.childCount > 0
            ? "Move or archive its subcategories first. Archiving is blocked while it has active subcategories."
            : "It disappears from the store and from new product choices. Products that already use it keep it."
        }
        destructive
        onConfirm={() => {
          if (archiving) {
            archive.mutate({
              id: archiving.id,
              expectedUpdatedAt: archiving.updatedAt,
            });
          }
        }}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        open={archiving !== null}
        pending={archive.isPending}
        title={`Archive ${archiving?.name ?? ""}?`}
      />
    </div>
  );
}
