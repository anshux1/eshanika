"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@eshanika/ui/components/sheet";
import { Tabs, TabsList, TabsTrigger } from "@eshanika/ui/components/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { ReorderButtons } from "@/components/patterns/reorder-buttons";
import { orpc } from "@/orpc/query";
import { useAllOptions } from "../hooks/use-taxonomy-lists";
import type { Attribute } from "./attribute-dialog";
import { type AttributeOption, OptionDialog } from "./option-dialog";

export function OptionsSheet({
  attribute,
  onClose,
}: {
  attribute: Attribute | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [editing, setEditing] = useState<AttributeOption | "new" | null>(null);
  const [archiving, setArchiving] = useState<AttributeOption | null>(null);
  const options = useAllOptions(attribute?.id ?? null, status);
  const editable = attribute?.status === "active";

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.catalog.attributes.key() });
  const reorder = useMutation(
    orpc.catalog.attributes.options.reorder.mutationOptions({
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: refresh,
    }),
  );
  const archive = useMutation(
    orpc.catalog.attributes.options.archive.mutationOptions({
      onSuccess: (option) => {
        toast.success(`${option.name} archived`);
        setArchiving(null);
      },
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: refresh,
    }),
  );

  const items = options.data?.items ?? [];

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={attribute !== null}
    >
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>{attribute?.name} options</SheetTitle>
          <SheetDescription>
            {attribute?.displayType === "swatch"
              ? "Shown as colour swatches. Each option needs a colour."
              : "Shown as a dropdown list."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Tabs
            onValueChange={(value) => setStatus(value as typeof status)}
            value={status}
          >
            <TabsList aria-label="Filter options by status">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
          {editable ? (
            <Button onClick={() => setEditing("new")} size="sm">
              <Plus aria-hidden />
              Add option
            </Button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {options.isPending ? (
            <LoadingState rows={4} />
          ) : options.isError ? (
            <ErrorState
              error={options.error}
              onRetry={() => options.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              description={
                status === "archived"
                  ? "Archived options show up here."
                  : "Add the values shoppers can choose."
              }
              title={status === "archived" ? "Nothing archived" : "No options"}
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {items.map((option, index) => (
                <li
                  className="flex items-center gap-3 px-3 py-2.5"
                  key={option.id}
                >
                  <span
                    aria-hidden
                    className="size-6 shrink-0 rounded-full border shadow-xs"
                    style={{
                      background:
                        option.swatchValue ??
                        "repeating-conic-gradient(var(--color-muted) 0% 25%, transparent 0% 50%) 50% / 6px 6px",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {option.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {option.slug}
                      {option.swatchValue ? ` · ${option.swatchValue}` : ""}
                    </p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {option.usageCount} use{option.usageCount === 1 ? "" : "s"}
                  </span>
                  {editable && status === "active" ? (
                    <div className="flex items-center">
                      <ReorderButtons
                        count={items.length}
                        disabled={reorder.isPending}
                        index={index}
                        label={option.name}
                        onMove={(offset) =>
                          reorder.mutate({
                            id: option.id,
                            sortOrder: index + offset,
                            expectedUpdatedAt: option.updatedAt,
                          })
                        }
                      />
                      <Button
                        aria-label={`Edit ${option.name}`}
                        onClick={() => setEditing(option)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        aria-label={`Archive ${option.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setArchiving(option)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Archive aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
      {attribute && editing ? (
        <OptionDialog
          attribute={attribute}
          key={editing === "new" ? "new" : editing.id}
          onClose={() => setEditing(null)}
          option={editing === "new" ? null : editing}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Archive"
        description="It won't be offered for new products. Products and variants that already use it keep it."
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
    </Sheet>
  );
}
