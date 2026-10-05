"use client";

import { Button } from "@eshanika/ui/components/button";
import { Checkbox } from "@eshanika/ui/components/checkbox";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorCode, errorMessage } from "@/components/patterns/page-state";
import { fromIstInputValue } from "@/lib/format";
import { orpc } from "@/orpc/query";

export type ShippableLine = {
  id: string;
  name: string;
  detail: string;
  ordered: number;
  assigned: number;
};

function shipmentFormSchema(lines: ShippableLine[]) {
  const remaining = new Map(
    lines.map((line) => [line.id, line.ordered - line.assigned]),
  );
  return z
    .object({
      items: z.array(
        z.object({
          orderItemId: z.string(),
          selected: z.boolean(),
          quantity: z.string().trim(),
        }),
      ),
      carrier: z
        .string()
        .trim()
        .min(1, "Enter the courier name")
        .max(120, "Keep the courier name under 120 characters"),
      trackingNumber: z
        .string()
        .trim()
        .max(200, "Keep the tracking number under 200 characters"),
      trackingUrl: z.union([
        z.literal(""),
        z.url("Enter a full link starting with https://").max(2000),
      ]),
      estimatedDeliveryAt: z.string(),
    })
    .superRefine((values, context) => {
      const chosen = values.items.filter((item) => item.selected);
      if (chosen.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["items"],
          message: "Choose at least one item to ship",
        });
      }
      values.items.forEach((item, index) => {
        if (!item.selected) return;
        const max = remaining.get(item.orderItemId) ?? 0;
        const quantity = /^\d{1,6}$/.test(item.quantity)
          ? Number(item.quantity)
          : 0;
        if (quantity < 1 || quantity > max) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "quantity"],
            message: `Enter 1 to ${max}`,
          });
        }
      });
    });
}

type ShipmentFormValues = z.input<ReturnType<typeof shipmentFormSchema>>;

// One idempotency key per opening; a retried submit reuses it, so the shipment is created once.
export function CreateShipmentDialog({
  orderId,
  lines,
  open,
  onOpenChange,
}: {
  orderId: string;
  lines: ShippableLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setKey(crypto.randomUUID());
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {key ? (
          <ShipmentForm
            idempotencyKey={key}
            key={key}
            lines={lines}
            onDone={() => onOpenChange(false)}
            orderId={orderId}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ShipmentForm({
  orderId,
  lines,
  idempotencyKey,
  onDone,
}: {
  orderId: string;
  lines: ShippableLine[];
  idempotencyKey: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const open = lines.filter((line) => line.ordered > line.assigned);
  const schema = shipmentFormSchema(lines);
  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: open.map((line) => ({
        orderItemId: line.id,
        selected: true,
        quantity: String(line.ordered - line.assigned),
      })),
      carrier: "",
      trackingNumber: "",
      trackingUrl: "",
      estimatedDeliveryAt: "",
    },
  });
  const create = useMutation(
    orpc.fulfilments.create.mutationOptions({
      onSuccess: () => {
        toast.success("Shipment created");
        onDone();
      },
      onError: (error) => {
        form.setError("root", { message: errorMessage(error) });
        // Someone else may have shipped these units; reload the remaining amounts.
        if (errorCode(error) === "CONFLICT") {
          void queryClient.invalidateQueries({
            queryKey: orpc.orders.get.key({ input: { id: orderId } }),
          });
        }
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: orpc.orders.key() }),
    }),
  );
  const { errors } = form.formState;
  const items = form.watch("items");

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = schema.parse(values);
        create.mutate({
          orderId,
          idempotencyKey,
          items: parsed.items
            .filter((item) => item.selected)
            .map((item) => ({
              orderItemId: item.orderItemId,
              quantity: Number(item.quantity),
            })),
          carrier: parsed.carrier,
          trackingNumber: parsed.trackingNumber || undefined,
          trackingUrl: parsed.trackingUrl || undefined,
          estimatedDeliveryAt:
            fromIstInputValue(parsed.estimatedDeliveryAt) ?? undefined,
        });
      })}
    >
      <DialogHeader>
        <DialogTitle>Create shipment</DialogTitle>
        <DialogDescription>
          Choose what goes in this parcel. You can split the order across
          several shipments.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-5">
        {errors.root ? (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errors.root.message}
          </p>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Items</legend>
          <ul className="divide-y rounded-lg border">
            {open.map((line, index) => {
              const remaining = line.ordered - line.assigned;
              const quantityError = errors.items?.[index]?.quantity;
              return (
                <li className="flex items-center gap-3 px-3 py-2" key={line.id}>
                  <Checkbox
                    aria-label={`Ship ${line.name}`}
                    checked={items[index]?.selected ?? false}
                    id={`ship-${line.id}`}
                    onCheckedChange={(checked) =>
                      form.setValue(`items.${index}.selected`, checked, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                  />
                  <label
                    className="min-w-0 flex-1 text-sm"
                    htmlFor={`ship-${line.id}`}
                  >
                    <span className="block truncate font-medium">
                      {line.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {line.detail} · {remaining} left to ship
                    </span>
                  </label>
                  <div className="w-16 shrink-0">
                    <Input
                      aria-invalid={!!quantityError}
                      aria-label={`Quantity of ${line.name}`}
                      disabled={!items[index]?.selected}
                      inputMode="numeric"
                      {...form.register(`items.${index}.quantity`)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <FieldError
            errors={[
              errors.items?.root ?? errors.items,
              ...open.map((_, index) => errors.items?.[index]?.quantity),
            ]}
          />
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.carrier}>
            <FieldLabel htmlFor="shipment-carrier">Courier</FieldLabel>
            <Input
              aria-invalid={!!errors.carrier}
              id="shipment-carrier"
              placeholder="Delhivery"
              {...form.register("carrier")}
            />
            <FieldError errors={[errors.carrier]} />
          </Field>
          <Field data-invalid={!!errors.trackingNumber}>
            <FieldLabel htmlFor="shipment-tracking">Tracking number</FieldLabel>
            <Input
              aria-invalid={!!errors.trackingNumber}
              autoComplete="off"
              id="shipment-tracking"
              placeholder="Optional"
              {...form.register("trackingNumber")}
            />
            <FieldError errors={[errors.trackingNumber]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.trackingUrl}>
          <FieldLabel htmlFor="shipment-url">Tracking link</FieldLabel>
          <Input
            aria-invalid={!!errors.trackingUrl}
            id="shipment-url"
            inputMode="url"
            placeholder="Optional, https://"
            {...form.register("trackingUrl")}
          />
          <FieldError errors={[errors.trackingUrl]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="shipment-eta">Estimated delivery</FieldLabel>
          <Input
            id="shipment-eta"
            type="datetime-local"
            {...form.register("estimatedDeliveryAt")}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button
          disabled={create.isPending}
          onClick={onDone}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={create.isPending} type="submit">
          {create.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Create shipment
        </Button>
      </DialogFooter>
    </form>
  );
}
