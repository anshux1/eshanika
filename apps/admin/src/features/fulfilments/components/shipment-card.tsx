"use client";

import type { FulfillmentStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { errorMessage } from "@/components/patterns/page-state";
import {
  SHIPMENT_STATUS,
  ShipmentStatusBadge,
} from "@/features/orders/components/order-badges";
import type { OrderDetail } from "@/features/orders/components/order-model";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import type { ShippableLine } from "./create-shipment-dialog";
import { FailedDeliveryDialog, TrackingUpdateDialog } from "./shipment-dialogs";

type Shipment = OrderDetail["fulfillments"][number];

type Step = { to: FulfillmentStatus; label: string };

// Mirrors the server's transition table; the first step is the usual next one.
const NEXT_STEPS: Partial<Record<FulfillmentStatus, Step[]>> = {
  pending: [{ to: "packed", label: "Mark packed" }],
  packed: [{ to: "shipped", label: "Mark shipped" }],
  shipped: [
    { to: "out_for_delivery", label: "Out for delivery" },
    { to: "delivered", label: "Mark delivered" },
    { to: "failed", label: "Delivery failed" },
    { to: "returned", label: "Returned to us" },
  ],
  out_for_delivery: [
    { to: "delivered", label: "Mark delivered" },
    { to: "failed", label: "Delivery failed" },
    { to: "returned", label: "Returned to us" },
  ],
  failed: [
    { to: "out_for_delivery", label: "Retry delivery" },
    { to: "delivered", label: "Mark delivered" },
    { to: "returned", label: "Returned to us" },
  ],
  delivered: [{ to: "returned", label: "Returned to us" }],
};

const CONFIRMS: Partial<
  Record<FulfillmentStatus, { title: string; description: string }>
> = {
  shipped: {
    title: "Mark this shipment as shipped?",
    description:
      "Its units leave stock now: reservations are used up and sale movements are recorded. This can't be undone.",
  },
  returned: {
    title: "Mark this shipment as returned?",
    description:
      "Use this when the courier brings the parcel back. Restocking and refunds are handled separately.",
  },
};

export function ShipmentCard({
  shipment,
  index,
  orderId,
  itemNames,
  canWrite,
}: {
  shipment: Shipment;
  index: number;
  orderId: string;
  itemNames: Map<string, ShippableLine>;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<Step | null>(null);
  const [failing, setFailing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const steps = NEXT_STEPS[shipment.status] ?? [];
  const [primary, ...others] = steps;
  // A return is rare, so it never gets the filled button.
  const quietPrimary = primary?.to === "returned";

  const transition = useMutation(
    orpc.fulfilments.transition.mutationOptions({
      onSuccess: (result) => {
        toast.success(
          `Shipment ${index} is now ${SHIPMENT_STATUS[result.status].label.toLowerCase()}`,
        );
        setConfirming(null);
      },
      onError: (error) => {
        toast.error(errorMessage(error));
        setConfirming(null);
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.orders.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.inventory.key() }),
        ]),
    }),
  );

  function run(step: Step) {
    if (step.to === "failed") {
      setFailing(true);
      return;
    }
    if (CONFIRMS[step.to] && confirming?.to !== step.to) {
      setConfirming(step);
      return;
    }
    transition.mutate({ id: shipment.id, to: step.to });
  }

  const events = [...shipment.fulfillmentEvents].reverse();

  return (
    <section
      aria-label={`Shipment ${index}`}
      className="@container rounded-lg border p-4"
    >
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-medium">
            Shipment {index}
            <ShipmentStatusBadge status={shipment.status} />
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {shipment.carrier}
            {shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ""}
            {shipment.trackingUrl ? (
              <a
                className="ml-2 inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
                href={shipment.trackingUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Track
                <ExternalLink aria-hidden className="size-3" />
              </a>
            ) : null}
          </p>
        </div>
        {canWrite ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => setUpdating(true)} size="sm" variant="ghost">
              <MessageSquarePlus aria-hidden />
              Add update
            </Button>
            {primary ? (
              <div className="flex">
                <Button
                  className={others.length > 0 ? "rounded-r-none" : undefined}
                  disabled={transition.isPending}
                  onClick={() => run(primary)}
                  size="sm"
                  variant={quietPrimary ? "outline" : "default"}
                >
                  {transition.isPending ? (
                    <Loader2 aria-hidden className="animate-spin" />
                  ) : null}
                  {primary.label}
                </Button>
                {others.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label="More shipment actions"
                          className="rounded-l-none border-l border-l-primary-foreground/20"
                          disabled={transition.isPending}
                          size="icon-sm"
                        />
                      }
                    >
                      <ChevronDown aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {others.map((step) => (
                        <DropdownMenuItem
                          key={step.to}
                          onClick={() => run(step)}
                          variant={
                            step.to === "failed" || step.to === "returned"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {step.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {shipment.fulfillmentItems.map((item) => {
          const line = itemNames.get(item.orderItemId);
          return (
            <li className="flex justify-between gap-3" key={item.orderItemId}>
              <span className="min-w-0 truncate">
                {line?.name ?? "Removed item"}
                <span className="text-muted-foreground">
                  {line ? ` · ${line.detail}` : ""}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">× {item.quantity}</span>
            </li>
          );
        })}
      </ul>

      <dl className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {shipment.estimatedDeliveryAt ? (
          <div>
            <dt>Expected</dt>
            <dd className="text-foreground">
              {formatDateTime(shipment.estimatedDeliveryAt)}
            </dd>
          </div>
        ) : null}
        {shipment.shippedAt ? (
          <div>
            <dt>Shipped</dt>
            <dd className="text-foreground">
              {formatDateTime(shipment.shippedAt)}
            </dd>
          </div>
        ) : null}
        {shipment.deliveredAt ? (
          <div>
            <dt>Delivered</dt>
            <dd className="text-foreground">
              {formatDateTime(shipment.deliveredAt)}
            </dd>
          </div>
        ) : null}
      </dl>
      {shipment.status === "failed" && shipment.failureReason ? (
        <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Delivery failed: {shipment.failureReason}
        </p>
      ) : null}

      {events.length > 0 ? (
        <details className="group mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
            Tracking history ({events.length})
          </summary>
          <ol className="mt-2 space-y-2 border-l pl-4">
            {events.map((event) => (
              <li className="text-sm" key={event.id}>
                <p>
                  <span className="font-medium">
                    {SHIPMENT_STATUS[event.status].label}
                  </span>
                  {event.description ? ` · ${event.description}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                  {event.location ? ` · ${event.location}` : ""}
                  {event.createdByUser ? ` · ${event.createdByUser.name}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <ConfirmDialog
        confirmLabel={confirming?.label ?? ""}
        description={
          confirming ? (CONFIRMS[confirming.to]?.description ?? "") : ""
        }
        destructive={confirming?.to === "returned"}
        onConfirm={() => {
          if (confirming) run(confirming);
        }}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        open={confirming !== null}
        pending={transition.isPending}
        title={confirming ? (CONFIRMS[confirming.to]?.title ?? "") : ""}
      />
      <FailedDeliveryDialog
        onOpenChange={setFailing}
        open={failing}
        orderId={orderId}
        shipmentId={shipment.id}
      />
      <TrackingUpdateDialog
        onOpenChange={setUpdating}
        open={updating}
        orderId={orderId}
        shipmentId={shipment.id}
      />
    </section>
  );
}
