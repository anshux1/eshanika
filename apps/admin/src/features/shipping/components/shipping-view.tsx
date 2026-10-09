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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
import { Switch } from "@eshanika/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { PageHeader } from "@/components/patterns/page-header";
import {
  EmptyState,
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { ReorderButtons } from "@/components/patterns/reorder-buttons";
import { StatusBadge } from "@/components/patterns/status-badge";
import { formatInr, rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import type { INDIAN_STATES } from "../indian-states";
import { type Method, MethodDialog, REQUIREMENT_LABELS } from "./method-dialog";
import { QuotePreview } from "./quote-preview";
import { type Zone, ZoneDialog } from "./zone-dialog";

type IndianState = (typeof INDIAN_STATES)[number];

type Deleting =
  | { kind: "zone"; zone: Zone }
  | { kind: "method"; method: Method }
  | null;

function version(record: { updatedAt: Date | string }) {
  return new Date(record.updatedAt).toISOString();
}

function requirementText(method: Method) {
  if (method.requirement === "minimum_subtotal" && method.minimumSubtotal)
    return `Carts of ${formatInr(method.minimumSubtotal)} or more${method.ignoreDiscounts ? ", before discounts" : ""}`;
  if (method.requirement === "coupon") return "With a free-shipping coupon";
  return REQUIREMENT_LABELS.none;
}

export function ShippingView() {
  const queryClient = useQueryClient();
  const [editingZone, setEditingZone] = useState<Zone | "new" | null>(null);
  const [editingMethod, setEditingMethod] = useState<{
    zone: Zone;
    method: Method | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);
  const zones = useQuery(orpc.shipping.zones.list.queryOptions());
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: orpc.shipping.key() });
  const onError = (error: unknown) => toast.error(errorMessage(error));

  const updateZone = useMutation(
    orpc.shipping.zones.update.mutationOptions({ onError, onSettled: refresh }),
  );
  const moveZone = useMutation(
    orpc.shipping.zones.move.mutationOptions({ onError, onSettled: refresh }),
  );
  const updateMethod = useMutation(
    orpc.shipping.methods.update.mutationOptions({
      onError,
      onSettled: refresh,
    }),
  );
  const moveMethod = useMutation(
    orpc.shipping.methods.move.mutationOptions({ onError, onSettled: refresh }),
  );
  const deleteZone = useMutation(
    orpc.shipping.zones.delete.mutationOptions({
      onSuccess: () => toast.success("Zone deleted"),
      onError,
      onSettled: () => {
        setDeleting(null);
        return refresh();
      },
    }),
  );
  const deleteMethod = useMutation(
    orpc.shipping.methods.delete.mutationOptions({
      onSuccess: () => toast.success("Method deleted"),
      onError,
      onSettled: () => {
        setDeleting(null);
        return refresh();
      },
    }),
  );
  const busy =
    updateZone.isPending ||
    moveZone.isPending ||
    updateMethod.isPending ||
    moveMethod.isPending;
  const items = zones.data ?? [];
  const addZone = (
    <Button onClick={() => setEditingZone("new")}>
      <Plus aria-hidden />
      Add zone
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        actions={addZone}
        description="Checkout picks the zone for the delivery state, then offers that zone's methods in this order. Placed orders keep the shipping they were charged."
        title="Shipping"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {zones.isPending ? (
            <LoadingState rows={4} />
          ) : zones.isError ? (
            <ErrorState error={zones.error} onRetry={() => zones.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              action={addZone}
              description="Add a zone for the states you ship to, then add its methods."
              title="No shipping zones yet"
            />
          ) : (
            items.map((zone, index) => (
              <Card key={zone.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {zone.name}
                    {zone.enabled ? null : (
                      <StatusBadge tone="muted">Off</StatusBadge>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {zone.states.length === 0
                      ? "Every state not in another zone"
                      : zone.states.join(", ")}
                  </CardDescription>
                  <CardAction className="flex items-center gap-1">
                    <Switch
                      aria-label={`${zone.enabled ? "Turn off" : "Turn on"} ${zone.name}`}
                      checked={zone.enabled}
                      disabled={busy}
                      onCheckedChange={(enabled) =>
                        updateZone.mutate({
                          id: zone.id,
                          expectedUpdatedAt: version(zone),
                          name: zone.name,
                          states: zone.states as IndianState[],
                          enabled,
                        })
                      }
                    />
                    <ReorderButtons
                      count={items.length}
                      disabled={busy}
                      index={index}
                      label={zone.name}
                      onMove={(offset) =>
                        moveZone.mutate({
                          id: zone.id,
                          expectedUpdatedAt: version(zone),
                          direction: offset < 0 ? "up" : "down",
                        })
                      }
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            aria-label={`More actions for ${zone.name}`}
                            size="icon-sm"
                            variant="ghost"
                          />
                        }
                      >
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingZone(zone)}>
                          <Pencil aria-hidden />
                          Edit zone
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setEditingMethod({ zone, method: null })
                          }
                        >
                          <Plus aria-hidden />
                          Add method
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleting({ kind: "zone", zone })}
                          variant="destructive"
                        >
                          <Trash2 aria-hidden />
                          Delete zone
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  {zone.shippingMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No methods yet, so checkout offers nothing here.
                    </p>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {zone.shippingMethods.map((method, methodIndex) => (
                        <li
                          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2"
                          key={method.id}
                        >
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="flex items-center gap-2 text-sm font-medium">
                              <span className="truncate">{method.title}</span>
                              {method.enabled ? null : (
                                <StatusBadge tone="muted">Off</StatusBadge>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {requirementText(method)}
                            </p>
                          </div>
                          <span className="text-sm tabular-nums">
                            {method.kind === "free_shipping" ||
                            rupeesToPaise(method.cost) === 0
                              ? "Free"
                              : formatInr(method.cost)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Switch
                              aria-label={`${method.enabled ? "Turn off" : "Turn on"} ${method.title}`}
                              checked={method.enabled}
                              disabled={busy}
                              onCheckedChange={(enabled) =>
                                updateMethod.mutate({
                                  id: method.id,
                                  expectedUpdatedAt: version(method),
                                  kind: method.kind,
                                  title: method.title,
                                  cost: method.cost,
                                  requirement: method.requirement,
                                  minimumSubtotal: method.minimumSubtotal,
                                  ignoreDiscounts: method.ignoreDiscounts,
                                  taxable: method.taxable,
                                  enabled,
                                })
                              }
                              size="sm"
                            />
                            <ReorderButtons
                              count={zone.shippingMethods.length}
                              disabled={busy}
                              index={methodIndex}
                              label={method.title}
                              onMove={(offset) =>
                                moveMethod.mutate({
                                  id: method.id,
                                  expectedUpdatedAt: version(method),
                                  direction: offset < 0 ? "up" : "down",
                                })
                              }
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    aria-label={`More actions for ${method.title}`}
                                    size="icon-sm"
                                    variant="ghost"
                                  />
                                }
                              >
                                <MoreHorizontal aria-hidden />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setEditingMethod({ zone, method })
                                  }
                                >
                                  <Pencil aria-hidden />
                                  Edit method
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDeleting({ kind: "method", method })
                                  }
                                  variant="destructive"
                                >
                                  <Trash2 aria-hidden />
                                  Delete method
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    onClick={() => setEditingMethod({ zone, method: null })}
                    size="sm"
                    variant="outline"
                  >
                    <Plus aria-hidden />
                    Add method
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <QuotePreview />
      </div>

      {editingZone ? (
        <ZoneDialog
          onClose={() => setEditingZone(null)}
          zone={editingZone === "new" ? null : editingZone}
        />
      ) : null}
      {editingMethod ? (
        <MethodDialog
          method={editingMethod.method}
          onClose={() => setEditingMethod(null)}
          zone={editingMethod.zone}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deleting?.kind === "zone"
            ? "Its methods are deleted too. Checkout stops offering them right away. Placed orders aren't affected."
            : "Checkout stops offering it right away. Placed orders aren't affected."
        }
        destructive
        onConfirm={() => {
          if (deleting?.kind === "zone")
            deleteZone.mutate({
              id: deleting.zone.id,
              expectedUpdatedAt: version(deleting.zone),
            });
          if (deleting?.kind === "method")
            deleteMethod.mutate({
              id: deleting.method.id,
              expectedUpdatedAt: version(deleting.method),
            });
        }}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        open={deleting !== null}
        pending={deleteZone.isPending || deleteMethod.isPending}
        title={
          deleting?.kind === "zone"
            ? `Delete ${deleting.zone.name}?`
            : `Delete ${deleting?.kind === "method" ? deleting.method.title : "method"}?`
        }
      />
    </div>
  );
}
