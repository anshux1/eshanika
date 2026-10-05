import type { OrderStatusHistorySource } from "@eshanika/database/enums";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { cn } from "@eshanika/ui/lib/utils";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUS } from "./order-badges";
import type { OrderDetail } from "./order-model";

const SOURCE_LABELS: Record<OrderStatusHistorySource, string> = {
  admin: "Team",
  system: "Store",
  carrier: "Courier",
};

export function OrderTimeline({ order }: { order: OrderDetail }) {
  const steps = [...order.orderStatusHistories].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No status changes yet.
          </p>
        ) : (
          <ol className="relative space-y-5 border-l pl-5">
            {steps.map((step, index) => (
              <li className="relative" key={step.id}>
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-card",
                    index === 0 ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
                <p className="text-sm font-medium">
                  {ORDER_STATUS[step.toStatus].label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(step.occurredAt)} ·{" "}
                  {step.changedByUser?.name ?? SOURCE_LABELS[step.source]}
                </p>
                {step.note ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                    {step.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
