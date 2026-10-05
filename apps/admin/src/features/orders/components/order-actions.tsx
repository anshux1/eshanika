"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Textarea } from "@eshanika/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, CircleCheck, Loader2, PackageOpen } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { orpc } from "@/orpc/query";
import { ORDER_STATUS } from "./order-badges";
import { canCancel, type OrderDetail } from "./order-model";

const cancelFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason for the cancellation")
    .max(1000, "Keep the reason under 1,000 characters"),
});

// Shipping statuses come from shipments, so staff only move these two steps by hand.
const NEXT_STEP = {
  created: { to: "confirmed", label: "Confirm order", icon: CircleCheck },
  confirmed: { to: "processing", label: "Start processing", icon: PackageOpen },
} as const;

export function OrderActions({ order }: { order: OrderDetail }) {
  const queryClient = useQueryClient();
  const [cancelKey, setCancelKey] = useState<string | null>(null);
  const step =
    order.status === "created" || order.status === "confirmed"
      ? NEXT_STEP[order.status]
      : null;

  const transition = useMutation(
    orpc.orders.transition.mutationOptions({
      onSuccess: (result) =>
        toast.success(
          `${order.orderNumber} is now ${ORDER_STATUS[result.status].label.toLowerCase()}`,
        ),
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: orpc.orders.key() }),
    }),
  );

  return (
    <>
      {canCancel(order) ? (
        <Button
          disabled={transition.isPending}
          onClick={() => setCancelKey(crypto.randomUUID())}
          variant="outline"
        >
          <Ban aria-hidden />
          Cancel order
        </Button>
      ) : null}
      {step ? (
        <Button
          disabled={transition.isPending}
          onClick={() => transition.mutate({ id: order.id, to: step.to })}
        >
          {transition.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <step.icon aria-hidden />
          )}
          {step.label}
        </Button>
      ) : null}
      <Dialog
        onOpenChange={(open) => {
          if (!open) setCancelKey(null);
        }}
        open={cancelKey !== null}
      >
        <DialogContent className="sm:max-w-md">
          {cancelKey ? (
            <CancelOrderForm
              idempotencyKey={cancelKey}
              onDone={() => setCancelKey(null)}
              order={order}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CancelOrderForm({
  order,
  idempotencyKey,
  onDone,
}: {
  order: OrderDetail;
  idempotencyKey: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<z.input<typeof cancelFormSchema>>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: { reason: "" },
  });
  const { errors } = form.formState;
  const paid =
    order.paymentStatus === "paid" ||
    order.paymentStatus === "partially_refunded";

  const cancel = useMutation(
    orpc.orders.cancel.mutationOptions({
      onSuccess: (result) => {
        if (result.refundNeeded) {
          toast.warning(
            `${order.orderNumber} is cancelled. It was paid, so issue a refund.`,
            { duration: 10_000 },
          );
        } else {
          toast.success(`${order.orderNumber} is cancelled`);
        }
        onDone();
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.orders.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.inventory.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.customers.key() }),
        ]),
    }),
  );

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) =>
        cancel.mutate({
          id: order.id,
          reason: cancelFormSchema.parse(values).reason,
          idempotencyKey,
        }),
      )}
    >
      <DialogHeader>
        <DialogTitle>Cancel {order.orderNumber}?</DialogTitle>
        <DialogDescription>
          Reserved stock goes back on sale. This can't be undone.
          {paid
            ? " The order is paid, so you'll need to refund it separately. Cancelling never refunds automatically."
            : null}
        </DialogDescription>
      </DialogHeader>
      {errors.root ? (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {errors.root.message}
        </p>
      ) : null}
      <Field data-invalid={!!errors.reason}>
        <FieldLabel htmlFor="cancel-reason">Reason</FieldLabel>
        <Textarea
          aria-invalid={!!errors.reason}
          id="cancel-reason"
          placeholder="For example, the customer asked to cancel"
          rows={3}
          {...form.register("reason")}
        />
        <FieldDescription>Shown in the order timeline.</FieldDescription>
        <FieldError errors={[errors.reason]} />
      </Field>
      <DialogFooter>
        <Button
          disabled={cancel.isPending}
          onClick={onDone}
          type="button"
          variant="outline"
        >
          Keep order
        </Button>
        <Button disabled={cancel.isPending} type="submit" variant="destructive">
          {cancel.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Cancel order
        </Button>
      </DialogFooter>
    </form>
  );
}
