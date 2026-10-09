"use client";

import type { ReturnStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import {
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import type { OrderDetail } from "@/features/orders/components/order-model";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { RETURN_STATUS, ReturnStatusBadge } from "./return-badges";
import { type ReturnLine, ReturnLinesDialog } from "./return-lines-dialog";

type Return = RouterOutputs["returns"]["list"]["items"][number];
type Step = "approved" | "rejected" | "cancelled" | "received" | "completed";

const ACTIVE: ReturnStatus[] = [
  "requested",
  "approved",
  "received",
  "completed",
];

const STEPS: Record<
  Step,
  { label: string; confirm?: string; destructive?: boolean }
> = {
  approved: { label: "Approve" },
  received: { label: "Mark received" },
  rejected: {
    label: "Reject",
    confirm:
      "The customer keeps the items and the units can be returned again later.",
    destructive: true,
  },
  cancelled: {
    label: "Cancel return",
    confirm: "Use this when the customer no longer wants to return the items.",
    destructive: true,
  },
  completed: {
    label: "Complete",
    confirm:
      "Completing closes the return, so restock what you need first. It doesn't refund the customer.",
  },
};

const NEXT_STEPS: Partial<Record<ReturnStatus, Step[]>> = {
  requested: ["rejected", "cancelled", "approved"],
  approved: ["cancelled", "received"],
  received: ["completed"],
};

function useRefresh(orderId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.returns.key() }),
      queryClient.invalidateQueries({
        queryKey: orpc.orders.get.key({ input: { id: orderId } }),
      }),
      queryClient.invalidateQueries({ queryKey: orpc.inventory.key() }),
    ]);
}

export function OrderReturns({
  order,
  canWrite,
}: {
  order: OrderDetail;
  canWrite: boolean;
}) {
  const refresh = useRefresh(order.id);
  const [creating, setCreating] = useState(false);
  const returns = useQuery(
    orpc.returns.list.queryOptions({
      input: { orderId: order.id, limit: 100 },
    }),
  );
  const create = useMutation(
    orpc.returns.create.mutationOptions({
      onSuccess: () => {
        toast.success("Return created");
        setCreating(false);
      },
      onSettled: refresh,
    }),
  );

  const delivered = new Map<string, number>();
  for (const shipment of order.fulfillments) {
    if (shipment.status !== "delivered") continue;
    for (const item of shipment.fulfillmentItems)
      delivered.set(
        item.orderItemId,
        (delivered.get(item.orderItemId) ?? 0) + item.quantity,
      );
  }
  for (const request of returns.data?.items ?? []) {
    if (!ACTIVE.includes(request.status)) continue;
    for (const item of request.items)
      delivered.set(
        item.orderItemId,
        (delivered.get(item.orderItemId) ?? 0) - item.quantity,
      );
  }
  const lines: ReturnLine[] = order.orderItems
    .map((item) => ({
      id: item.id,
      name: item.productNameSnapshot,
      detail:
        item.variantNameSnapshot &&
        item.variantNameSnapshot !== item.productNameSnapshot
          ? `${item.variantNameSnapshot} · ${item.skuSnapshot}`
          : item.skuSnapshot,
      max: delivered.get(item.id) ?? 0,
    }))
    .filter((line) => line.max > 0);
  const paid =
    order.paymentStatus === "paid" ||
    order.paymentStatus === "partially_refunded";
  const items = returns.data?.items ?? [];

  return (
    <Card id="returns">
      <CardHeader>
        <CardTitle>Returns</CardTitle>
        <CardDescription>
          {lines.length > 0
            ? "Delivered items can be returned. Refunds and restocking are separate steps."
            : items.length > 0
              ? "Every delivered unit is already in a return."
              : "Items can be returned once they're delivered."}
        </CardDescription>
        {canWrite && lines.length > 0 && returns.isSuccess ? (
          <CardAction>
            <Button
              onClick={() => setCreating(true)}
              size="sm"
              variant="outline"
            >
              <Undo2 aria-hidden />
              Create return
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      {returns.isPending ? (
        <CardContent>
          <LoadingState rows={2} />
        </CardContent>
      ) : returns.isError ? (
        <CardContent>
          <ErrorState error={returns.error} onRetry={() => returns.refetch()} />
        </CardContent>
      ) : items.length > 0 ? (
        <CardContent className="space-y-4">
          {items.map((request, index) => (
            <ReturnCard
              canWrite={canWrite}
              index={items.length - index}
              key={request.id}
              onChanged={refresh}
              paid={paid}
              request={request}
            />
          ))}
        </CardContent>
      ) : null}
      <ReturnLinesDialog
        copy={{
          title: "Create return",
          description:
            "Record what the customer is sending back. Nothing is refunded or restocked yet.",
          submitLabel: "Create return",
          maxLabel: "delivered and not returned",
        }}
        error={create.error ? errorMessage(create.error) : null}
        lines={lines}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) create.reset();
        }}
        onSubmit={(values) =>
          create.mutate({
            orderId: order.id,
            reason: values.reason,
            items: values.items,
            idempotencyKey: values.idempotencyKey,
          })
        }
        open={creating}
        pending={create.isPending}
        withReason
      />
    </Card>
  );
}

function ReturnCard({
  request,
  index,
  canWrite,
  paid,
  onChanged,
}: {
  request: Return;
  index: number;
  canWrite: boolean;
  paid: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const [confirming, setConfirming] = useState<Step | null>(null);
  const [restocking, setRestocking] = useState(false);
  const transition = useMutation(
    orpc.returns.transition.mutationOptions({
      onSuccess: (result) => {
        toast.success(
          `Return is now ${RETURN_STATUS[result.status].label.toLowerCase()}`,
        );
        setConfirming(null);
      },
      onError: (error) => {
        toast.error(errorMessage(error));
        setConfirming(null);
      },
      onSettled: onChanged,
    }),
  );
  const restock = useMutation(
    orpc.returns.restock.mutationOptions({
      onSuccess: () => {
        toast.success("Stock updated");
        setRestocking(false);
      },
      onSettled: onChanged,
    }),
  );
  const restockLines: ReturnLine[] = request.items
    .filter((item) => item.tracksStock)
    .map((item) => ({
      id: item.orderItemId,
      name: item.productName,
      detail:
        item.variantName && item.variantName !== item.productName
          ? `${item.variantName} · ${item.sku}`
          : item.sku,
      max: item.quantity - item.restockedQuantity,
    }))
    .filter((line) => line.max > 0);
  const steps = canWrite ? (NEXT_STEPS[request.status] ?? []) : [];
  const step = confirming ? STEPS[confirming] : null;

  return (
    <section className="rounded-lg border">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-sm font-medium">Return {index}</h3>
          <ReturnStatusBadge status={request.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(request.createdAt)}
          {request.requestedByUser ? ` by ${request.requestedByUser.name}` : ""}
        </p>
      </header>
      <div className="space-y-3 px-3 py-3 text-sm">
        <p className="whitespace-pre-wrap text-muted-foreground">
          {request.reason}
        </p>
        <ul className="space-y-1">
          {request.items.map((item) => (
            <li className="flex justify-between gap-3" key={item.orderItemId}>
              <span className="min-w-0 truncate">
                {item.quantity} × {item.productName}
                {item.variantName && item.variantName !== item.productName ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {item.variantName}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.tracksStock
                  ? `${item.restockedQuantity} restocked`
                  : "Stock not tracked"}
              </span>
            </li>
          ))}
        </ul>
        {paid &&
        (request.status === "received" || request.status === "completed") ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2">
            Returns never refund on their own.{" "}
            <a
              className="font-medium underline underline-offset-4"
              href="#payment"
            >
              Refund from Payment
            </a>
          </p>
        ) : null}
        {steps.length > 0 ||
        (canWrite &&
          request.status === "received" &&
          restockLines.length > 0) ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canWrite &&
            request.status === "received" &&
            restockLines.length > 0 ? (
              <Button
                onClick={() => setRestocking(true)}
                size="sm"
                variant="outline"
              >
                Restock
              </Button>
            ) : null}
            {steps.map((next) => (
              <Button
                disabled={transition.isPending}
                key={next}
                onClick={() =>
                  STEPS[next].confirm
                    ? setConfirming(next)
                    : transition.mutate({ id: request.id, to: next })
                }
                size="sm"
                variant={
                  next === "approved" || next === "received"
                    ? "default"
                    : "outline"
                }
              >
                {STEPS[next].label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        confirmLabel={step?.label ?? ""}
        description={step?.confirm ?? ""}
        destructive={step?.destructive}
        onConfirm={() => {
          if (confirming) transition.mutate({ id: request.id, to: confirming });
        }}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        open={confirming !== null}
        pending={transition.isPending}
        title={`${step?.label ?? ""}?`}
      />
      <ReturnLinesDialog
        copy={{
          title: "Restock returned items",
          description:
            "Only restock what can be sold again. Each unit is added to stock on hand and logged as a return movement.",
          submitLabel: "Restock",
          maxLabel: "left to restock",
        }}
        error={restock.error ? errorMessage(restock.error) : null}
        lines={restockLines}
        onOpenChange={(open) => {
          setRestocking(open);
          if (!open) restock.reset();
        }}
        onSubmit={(values) =>
          restock.mutate({
            id: request.id,
            items: values.items,
            idempotencyKey: values.idempotencyKey,
          })
        }
        open={restocking}
        pending={restock.isPending}
        withReason={false}
      />
    </section>
  );
}
