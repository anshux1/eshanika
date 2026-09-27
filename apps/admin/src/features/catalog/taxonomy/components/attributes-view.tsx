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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ListTree,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Rows3,
} from "lucide-react";
import { useState } from "react";
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
import { orpc } from "@/orpc/query";
import { useAllAttributes } from "../hooks/use-taxonomy-lists";
import { type Attribute, AttributeDialog } from "./attribute-dialog";
import { OptionsSheet } from "./options-sheet";

export function AttributesView() {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const status = url.get("status") === "archived" ? "archived" : "active";
  const search = url.get("q");
  const attributes = useAllAttributes(status, search);
  const [editing, setEditing] = useState<Attribute | "new" | null>(null);
  const [archiving, setArchiving] = useState<Attribute | null>(null);
  const items = attributes.data?.items ?? [];
  const openId = url.get("attribute");
  const open = items.find((item) => item.id === openId) ?? null;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.catalog.attributes.key() });
  const reorder = useMutation(
    orpc.catalog.attributes.reorder.mutationOptions({
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: refresh,
    }),
  );
  const archive = useMutation(
    orpc.catalog.attributes.archive.mutationOptions({
      onSuccess: (attribute) => {
        toast.success(`${attribute.name} archived`);
        setArchiving(null);
      },
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: refresh,
    }),
  );

  // Opening the options panel keeps the list filters, unlike useUrlState.set.
  function showOptions(id: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("attribute", id);
    else params.delete("attribute");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }

  const newButton = (
    <Button onClick={() => setEditing("new")}>
      <Plus aria-hidden />
      New attribute
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={newButton}
        description="Define the choices behind product variants, like metal, stone, and size."
        title="Attributes"
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
        <SearchInput placeholder="Search attributes" />
      </div>

      {attributes.isPending ? (
        <LoadingState />
      ) : attributes.isError ? (
        <ErrorState
          error={attributes.error}
          onRetry={() => attributes.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          action={!search && status === "active" ? newButton : undefined}
          description={
            search
              ? "No attribute matches that search."
              : status === "archived"
                ? "Archived attributes show up here."
                : "Add an attribute, like Metal, then its options."
          }
          title={search ? "No matches" : "No attributes"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden sm:table-cell">Display</TableHead>
                <TableHead className="hidden lg:table-cell">Products</TableHead>
                <TableHead className="w-40 pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((attribute, index) => (
                <TableRow key={attribute.id}>
                  <TableCell className="pl-4">
                    <button
                      className="text-left font-medium underline-offset-4 hover:underline"
                      onClick={() => showOptions(attribute.id)}
                      type="button"
                    >
                      {attribute.name}
                    </button>
                    <p className="font-mono text-xs text-muted-foreground">
                      {attribute.slug}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      {attribute.displayType === "swatch" ? (
                        <Palette aria-hidden className="size-4" />
                      ) : (
                        <Rows3 aria-hidden className="size-4" />
                      )}
                      {attribute.displayType === "swatch"
                        ? "Colour swatch"
                        : "Dropdown"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {status === "archived" ? (
                      <StatusBadge tone="muted">Archived</StatusBadge>
                    ) : (
                      attribute.usageCount
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-0.5">
                      {status === "active" && !search ? (
                        <ReorderButtons
                          count={items.length}
                          disabled={reorder.isPending}
                          index={index}
                          label={attribute.name}
                          onMove={(offset) =>
                            reorder.mutate({
                              id: attribute.id,
                              sortOrder: index + offset,
                              expectedUpdatedAt: attribute.updatedAt,
                            })
                          }
                        />
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              aria-label={`Actions for ${attribute.name}`}
                              size="icon-sm"
                              variant="ghost"
                            />
                          }
                        >
                          <MoreHorizontal aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => showOptions(attribute.id)}
                          >
                            <ListTree aria-hidden />
                            {status === "active"
                              ? "Edit options"
                              : "View options"}
                          </DropdownMenuItem>
                          {status === "active" ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => setEditing(attribute)}
                              >
                                <Pencil aria-hidden />
                                Edit attribute
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setArchiving(attribute)}
                                variant="destructive"
                              >
                                <Archive aria-hidden />
                                Archive
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OptionsSheet attribute={open} onClose={() => showOptions(null)} />
      {editing ? (
        <AttributeDialog
          attribute={editing === "new" ? null : editing}
          key={editing === "new" ? "new" : editing.id}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Archive"
        description={
          archiving && archiving.usageCount > 0
            ? `It stays on the ${archiving.usageCount} product${archiving.usageCount === 1 ? "" : "s"} that use it, but can't be added to new ones.`
            : "It won't be offered when creating products."
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
