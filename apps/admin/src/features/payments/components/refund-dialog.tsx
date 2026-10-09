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
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@eshanika/ui/components/input-group";
import { Textarea } from "@eshanika/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import { formatPaise } from "./payment-badges";

function refundFormSchema(refundableMinor: number) {
  return z.object({
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 499 or 499.50")
      .refine((value) => rupeesToPaise(value) > 0, "Enter more than zero")
      .refine(
        (value) => rupeesToPaise(value) <= refundableMinor,
        `You can refund at most ${formatPaise(String(refundableMinor))}`,
      ),
    reason: z
      .string()
      .trim()
      .min(1, "Say why you're refunding")
      .max(500, "Keep the reason under 500 characters"),
  });
}

type RefundFormValues = z.input<ReturnType<typeof refundFormSchema>>;

// One idempotency key per opening; a retried submit reuses it, so Razorpay is asked once.
export function RefundDialog({
  orderId,
  paymentId,
  refundableMinor,
  open,
  onOpenChange,
}: {
  orderId: string;
  paymentId: string;
  refundableMinor: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [key, setKey] = useState<string | null>(() =>
    open ? crypto.randomUUID() : null,
  );
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setKey(crypto.randomUUID());
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        {key ? (
          <RefundForm
            idempotencyKey={key}
            key={key}
            onDone={() => onOpenChange(false)}
            orderId={orderId}
            paymentId={paymentId}
            refundableMinor={refundableMinor}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RefundForm({
  orderId,
  paymentId,
  refundableMinor,
  idempotencyKey,
  onDone,
}: {
  orderId: string;
  paymentId: string;
  refundableMinor: number;
  idempotencyKey: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const schema = refundFormSchema(refundableMinor);
  const form = useForm<RefundFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: paiseToRupees(refundableMinor), reason: "" },
  });
  const { errors } = form.formState;
  const refund = useMutation(
    orpc.refunds.create.mutationOptions({
      onSuccess: (result) => {
        if (result.status === "failed") {
          form.setError("root", {
            message: result.failureReason ?? "Razorpay refused the refund.",
          });
          return;
        }
        if (result.status === "pending") {
          toast.info(
            "Refund sent. Razorpay hasn't confirmed it yet, so it stays pending until they do.",
            { duration: 10_000 },
          );
        } else {
          toast.success(`${formatPaise(result.amountMinor)} refunded`);
        }
        onDone();
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.payments.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.orders.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.orders.get.key({ input: { id: orderId } }),
          }),
        ]),
    }),
  );

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = schema.parse(values);
        refund.mutate({
          paymentId,
          amount: parsed.amount,
          reason: parsed.reason,
          idempotencyKey,
        });
      })}
    >
      <DialogHeader>
        <DialogTitle>Refund payment</DialogTitle>
        <DialogDescription>
          The money goes back to the customer's original payment method through
          Razorpay. This can't be undone.
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
        <Field data-invalid={!!errors.amount}>
          <FieldLabel htmlFor="refund-amount">Amount</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>₹</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              aria-invalid={!!errors.amount}
              id="refund-amount"
              inputMode="decimal"
              {...form.register("amount")}
            />
          </InputGroup>
          <FieldDescription>
            Up to {formatPaise(String(refundableMinor))} is left to refund.
          </FieldDescription>
          <FieldError errors={[errors.amount]} />
        </Field>
        <Field data-invalid={!!errors.reason}>
          <FieldLabel htmlFor="refund-reason">Reason</FieldLabel>
          <Textarea
            aria-invalid={!!errors.reason}
            id="refund-reason"
            placeholder="For example, returned item"
            rows={3}
            {...form.register("reason")}
          />
          <FieldError errors={[errors.reason]} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button
          disabled={refund.isPending}
          onClick={onDone}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={refund.isPending} type="submit" variant="destructive">
          {refund.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Refund
        </Button>
      </DialogFooter>
    </form>
  );
}
