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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { Textarea } from "@eshanika/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { fromIstInputValue } from "@/lib/format";
import { orpc } from "@/orpc/query";

type ShipmentDialogProps = {
  shipmentId: string;
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const location = z
  .string()
  .trim()
  .max(200, "Keep the location under 200 characters");

const failedFormSchema = z.object({
  failureReason: z
    .string()
    .trim()
    .min(1, "Say why the delivery failed")
    .max(1000, "Keep the reason under 1,000 characters"),
  location,
});

const updateFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Describe the update")
    .max(1000, "Keep the update under 1,000 characters"),
  location,
  occurredAt: z.string(),
});

function useRefreshOrder(orderId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: orpc.orders.get.key({ input: { id: orderId } }),
    });
}

function RootError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}

export function FailedDeliveryDialog(props: ShipmentDialogProps) {
  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent className="sm:max-w-md">
        {props.open ? <FailedDeliveryForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FailedDeliveryForm({
  shipmentId,
  orderId,
  onOpenChange,
}: ShipmentDialogProps) {
  const refresh = useRefreshOrder(orderId);
  const queryClient = useQueryClient();
  const form = useForm<z.input<typeof failedFormSchema>>({
    resolver: zodResolver(failedFormSchema),
    defaultValues: { failureReason: "", location: "" },
  });
  const transition = useMutation(
    orpc.fulfilments.transition.mutationOptions({
      onSuccess: () => {
        toast.success("Shipment marked as failed");
        onOpenChange(false);
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
      onSettled: () =>
        Promise.all([
          refresh(),
          queryClient.invalidateQueries({ queryKey: orpc.orders.list.key() }),
        ]),
    }),
  );
  const { errors } = form.formState;

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = failedFormSchema.parse(values);
        transition.mutate({
          id: shipmentId,
          to: "failed",
          failureReason: parsed.failureReason,
          location: parsed.location || undefined,
        });
      })}
    >
      <DialogHeader>
        <DialogTitle>Delivery failed</DialogTitle>
        <DialogDescription>
          You can retry delivery or mark it returned afterwards.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-5">
        <RootError message={errors.root?.message} />
        <Field data-invalid={!!errors.failureReason}>
          <FieldLabel htmlFor="failure-reason">Reason</FieldLabel>
          <Textarea
            aria-invalid={!!errors.failureReason}
            id="failure-reason"
            placeholder="For example, the customer wasn't home"
            rows={3}
            {...form.register("failureReason")}
          />
          <FieldError errors={[errors.failureReason]} />
        </Field>
        <Field data-invalid={!!errors.location}>
          <FieldLabel htmlFor="failure-location">Location</FieldLabel>
          <Input
            aria-invalid={!!errors.location}
            id="failure-location"
            placeholder="Optional, such as the courier hub"
            {...form.register("location")}
          />
          <FieldError errors={[errors.location]} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button
          disabled={transition.isPending}
          onClick={() => onOpenChange(false)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={transition.isPending}
          type="submit"
          variant="destructive"
        >
          {transition.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Mark as failed
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TrackingUpdateDialog(props: ShipmentDialogProps) {
  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent className="sm:max-w-md">
        {props.open ? <TrackingUpdateForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function TrackingUpdateForm({
  shipmentId,
  orderId,
  onOpenChange,
}: ShipmentDialogProps) {
  const refresh = useRefreshOrder(orderId);
  const form = useForm<z.input<typeof updateFormSchema>>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: { description: "", location: "", occurredAt: "" },
  });
  const addEvent = useMutation(
    orpc.fulfilments.addEvent.mutationOptions({
      onSuccess: () => {
        toast.success("Tracking update added");
        onOpenChange(false);
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
      onSettled: refresh,
    }),
  );
  const { errors } = form.formState;

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = updateFormSchema.parse(values);
        addEvent.mutate({
          id: shipmentId,
          description: parsed.description,
          location: parsed.location || undefined,
          occurredAt: fromIstInputValue(parsed.occurredAt) ?? undefined,
        });
      })}
    >
      <DialogHeader>
        <DialogTitle>Add tracking update</DialogTitle>
        <DialogDescription>
          Adds a line to the shipment's history without changing its status.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-5">
        <RootError message={errors.root?.message} />
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="update-description">Update</FieldLabel>
          <Textarea
            aria-invalid={!!errors.description}
            id="update-description"
            placeholder="For example, reached the Mumbai sorting hub"
            rows={2}
            {...form.register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.location}>
            <FieldLabel htmlFor="update-location">Location</FieldLabel>
            <Input
              aria-invalid={!!errors.location}
              id="update-location"
              placeholder="Optional"
              {...form.register("location")}
            />
            <FieldError errors={[errors.location]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="update-time">When</FieldLabel>
            <Input
              id="update-time"
              type="datetime-local"
              {...form.register("occurredAt")}
            />
          </Field>
        </div>
      </FieldGroup>
      <DialogFooter>
        <Button
          disabled={addEvent.isPending}
          onClick={() => onOpenChange(false)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={addEvent.isPending} type="submit">
          {addEvent.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Add update
        </Button>
      </DialogFooter>
    </form>
  );
}
