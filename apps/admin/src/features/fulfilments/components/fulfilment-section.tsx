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
import { PackagePlus } from "lucide-react";
import { useState } from "react";
import type { OrderDetail } from "@/features/orders/components/order-model";
import {
  CreateShipmentDialog,
  type ShippableLine,
} from "./create-shipment-dialog";
import { ShipmentCard } from "./shipment-card";

const SHIPPABLE_ORDER = [
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
];

export function FulfilmentSection({
  order,
  canWrite,
}: {
  order: OrderDetail;
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const assigned = new Map<string, number>();
  for (const shipment of order.fulfillments)
    for (const item of shipment.fulfillmentItems)
      assigned.set(
        item.orderItemId,
        (assigned.get(item.orderItemId) ?? 0) + item.quantity,
      );
  const lines: ShippableLine[] = order.orderItems.map((item) => ({
    id: item.id,
    name: item.productNameSnapshot,
    detail:
      item.variantNameSnapshot &&
      item.variantNameSnapshot !== item.productNameSnapshot
        ? `${item.variantNameSnapshot} · ${item.skuSnapshot}`
        : item.skuSnapshot,
    ordered: item.quantity,
    assigned: assigned.get(item.id) ?? 0,
  }));
  const unassigned = lines.reduce(
    (sum, line) => sum + line.ordered - line.assigned,
    0,
  );
  const canCreate =
    canWrite && unassigned > 0 && SHIPPABLE_ORDER.includes(order.status);
  const itemNames = new Map(lines.map((line) => [line.id, line]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfilment</CardTitle>
        <CardDescription>
          {order.status === "cancelled"
            ? "Cancelled orders don't ship."
            : order.status === "created"
              ? "Confirm the order before creating a shipment."
              : unassigned === 0
                ? "Every item is in a shipment."
                : `${unassigned} unit${unassigned === 1 ? "" : "s"} not in a shipment yet.`}
        </CardDescription>
        {canCreate ? (
          <CardAction>
            <Button onClick={() => setCreating(true)} size="sm">
              <PackagePlus aria-hidden />
              Create shipment
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-lg border text-sm">
          {lines.map((line) => (
            <li
              className="flex items-center justify-between gap-3 px-3 py-2"
              key={line.id}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{line.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {line.detail}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                <span className="block text-sm text-foreground">
                  {line.assigned} of {line.ordered}
                </span>
                in shipments
              </span>
            </li>
          ))}
        </ul>
        {order.fulfillments.map((shipment, index) => (
          <ShipmentCard
            canWrite={canWrite && order.status !== "cancelled"}
            index={index + 1}
            itemNames={itemNames}
            key={shipment.id}
            orderId={order.id}
            shipment={shipment}
          />
        ))}
      </CardContent>
      {canCreate ? (
        <CreateShipmentDialog
          lines={lines}
          onOpenChange={setCreating}
          open={creating}
          orderId={order.id}
        />
      ) : null}
    </Card>
  );
}
