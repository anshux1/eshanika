"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { cn } from "@eshanika/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
import { StatusBadge } from "@/components/patterns/status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { orpc } from "@/orpc/query";
import { MENU_LOCATIONS } from "../schema";
import { type MenuItem, MenuItemDialog } from "./menu-item-dialog";

const LOCATION_LABELS = { header: "Header", footer: "Footer" } as const;

function targetText(item: MenuItem) {
  if (item.contentEntry) return `Page · /${item.contentEntry.slug}`;
  if (item.category) return `Category · ${item.category.name}`;
  return item.url ?? "";
}

// Links whose target is no longer live still show, so staff can fix them.
function targetWarning(item: MenuItem) {
  if (item.contentEntry && item.contentEntry.status !== "published")
    return "Page not live";
  if (item.category && item.category.status !== "active")
    return "Category archived";
  return null;
}

export function MenusView() {
  const url = useUrlState();
  const queryClient = useQueryClient();
  const location =
    MENU_LOCATIONS.find((value) => value === url.get("location")) ?? "header";
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [removing, setRemoving] = useState<MenuItem | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [draft, setDraft] = useState<MenuItem[] | null>(null);
  const menu = useQuery(
    orpc.content.menus.get.queryOptions({ input: { location } }),
  );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.content.key() });
  const reorder = useMutation(
    orpc.content.menus.reorderItems.mutationOptions({
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => {
        setDraft(null);
        return refresh();
      },
    }),
  );
  const remove = useMutation(
    orpc.content.menus.removeItem.mutationOptions({
      onSuccess: () => toast.success(`${removing?.label ?? "Link"} removed`),
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => {
        setRemoving(null);
        return refresh();
      },
    }),
  );
  const items = draft ?? menu.data?.items ?? [];

  function save(next: MenuItem[]) {
    setDraft(next);
    reorder.mutate({ location, itemIds: next.map((item) => item.id) });
  }

  function moved(from: number, to: number) {
    const next = [...items];
    const [entry] = next.splice(from, 1);
    if (!entry) return items;
    next.splice(to, 0, entry);
    return next;
  }

  const addButton = (
    <Button onClick={() => setEditing("new")} size="sm">
      <Plus aria-hidden />
      Add link
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        description="Links in the store's header and footer, in the order shoppers see them."
        title="Menus"
      />
      <FilterTabs
        label="Menu location"
        options={MENU_LOCATIONS.map((value) => ({
          value,
          label: LOCATION_LABELS[value],
        }))}
        param="location"
      />
      {menu.isPending ? (
        <LoadingState rows={4} />
      ) : menu.isError ? (
        <ErrorState error={menu.error} onRetry={() => menu.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          action={addButton}
          description="Add pages, categories, or addresses to this menu."
          title={`The ${LOCATION_LABELS[location].toLowerCase()} menu is empty`}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{LOCATION_LABELS[location]} menu</CardTitle>
            <CardDescription>
              Drag links, or use the arrows, to change the order.
            </CardDescription>
            <CardAction>{addButton}</CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y overflow-hidden rounded-lg border">
              {items.map((item, index) => {
                const warning = targetWarning(item);
                return (
                  <li
                    className={cn(
                      "flex items-center gap-2 bg-card px-2 py-2",
                      dragging === item.id && "opacity-40",
                    )}
                    draggable={!reorder.isPending}
                    key={item.id}
                    onDragEnd={() => {
                      if (dragging && draft) save(draft);
                      setDragging(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      const from = items.findIndex(
                        (entry) => entry.id === dragging,
                      );
                      if (dragging && from !== index)
                        setDraft(moved(from, index));
                    }}
                    onDragStart={() => setDragging(item.id)}
                  >
                    <GripVertical
                      aria-hidden
                      className="size-4 shrink-0 cursor-grab text-muted-foreground"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{item.label}</span>
                        {warning ? (
                          <StatusBadge tone="warning">{warning}</StatusBadge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {targetText(item)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <ReorderButtons
                        count={items.length}
                        disabled={reorder.isPending}
                        index={index}
                        label={item.label}
                        onMove={(offset) => save(moved(index, index + offset))}
                      />
                      <Button
                        aria-label={`Edit ${item.label}`}
                        onClick={() => setEditing(item)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        aria-label={`Remove ${item.label}`}
                        onClick={() => setRemoving(item)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      {editing ? (
        <MenuItemDialog
          item={editing === "new" ? null : editing}
          location={location}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Remove"
        description="The link disappears from the store menu right away. The page or category itself stays."
        destructive
        onConfirm={() => {
          if (removing) remove.mutate({ id: removing.id });
        }}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        open={removing !== null}
        pending={remove.isPending}
        title={`Remove ${removing?.label ?? "link"}?`}
      />
    </div>
  );
}
