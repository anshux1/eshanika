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
import { Input } from "@eshanika/ui/components/input";
import { Textarea } from "@eshanika/ui/components/textarea";
import { cn } from "@eshanika/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { MANUAL_REASONS, REASON_LABELS } from "./movement-reasons";

export type StockRow = RouterOutputs["inventory"]["list"]["items"][number];

const adjustFormSchema = z.object({
  direction: z.enum(["add", "remove"]),
  quantity: z
    .string()
    .trim()
    .regex(/^[1-9]\d{0,8}$/, "Enter a whole number above zero"),
  reason: z.enum(MANUAL_REASONS),
  note: z.string().trim().max(1000, "Keep the note under 1,000 characters"),
});

type AdjustFormValues = z.input<typeof adjustFormSchema>;

// One idempotency key per opening, so a double click or a retry after a
// dropped response never records the change twice.
type Session = { row: StockRow; key: string };

export function AdjustStockDialog({
  row,
  onOpenChange,
}: {
  row: StockRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  // The session outlives `row` so the form stays on screen while the dialog animates closed.
  const [session, setSession] = useState<Session | null>(null);
  const [lastRow, setLastRow] = useState(row);
  if (row !== lastRow) {
    setLastRow(row);
    if (row) setSession({ row, key: crypto.randomUUID() });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={row !== null}>
      <DialogContent className="sm:max-w-md">
        {session ? (
          <AdjustStockForm
            idempotencyKey={session.key}
            key={session.key}
            onDone={() => onOpenChange(false)}
            row={session.row}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockForm({
  row,
  idempotencyKey,
  onDone,
}: {
  row: StockRow;
  idempotencyKey: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: {
      direction: "add",
      quantity: "",
      reason: "restock",
      note: "",
    },
  });
  const adjust = useMutation(
    orpc.inventory.adjust.mutationOptions({
      onSuccess: (movement) => {
        toast.success(`${row.sku} now has ${movement.quantityAfter} on hand`);
        void queryClient.invalidateQueries({
          queryKey: orpc.inventory.key(),
        });
        onDone();
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
    }),
  );

  const direction = form.watch("direction");
  const quantityText = form.watch("quantity");
  const quantity = /^[1-9]\d{0,8}$/.test(quantityText.trim())
    ? Number(quantityText.trim())
    : 0;
  const delta = direction === "add" ? quantity : -quantity;
  const onHandAfter = row.quantityOnHand + delta;
  const belowReserved = onHandAfter < row.quantityReserved;
  const { errors } = form.formState;

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = adjustFormSchema.parse(values);
        const amount = Number(parsed.quantity);
        adjust.mutate({
          variantId: row.id,
          quantityDelta: parsed.direction === "add" ? amount : -amount,
          reason: parsed.reason,
          note: parsed.note || undefined,
          idempotencyKey,
        });
      })}
    >
      <DialogHeader>
        <DialogTitle>Adjust stock</DialogTitle>
        <DialogDescription className="break-words">
          {row.productName}
          {row.name === row.productName ? "" : ` · ${row.name}`} · {row.sku}
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
        <Controller
          control={form.control}
          name="direction"
          render={({ field }) => (
            <fieldset className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <legend className="sr-only">Change type</legend>
              {(
                [
                  { value: "add", label: "Add stock", icon: Plus },
                  { value: "remove", label: "Remove stock", icon: Minus },
                ] as const
              ).map((option) => (
                <label
                  className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-ring"
                  key={option.value}
                >
                  <input
                    checked={field.value === option.value}
                    className="sr-only"
                    name={field.name}
                    onChange={() => {
                      field.onChange(option.value);
                      form.setValue(
                        "reason",
                        option.value === "add" ? "restock" : "damage",
                      );
                    }}
                    type="radio"
                    value={option.value}
                  />
                  <option.icon aria-hidden className="size-4" />
                  {option.label}
                </label>
              ))}
            </fieldset>
          )}
        />
        <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3">
          <Field data-invalid={!!errors.quantity}>
            <FieldLabel htmlFor="adjust-quantity">Quantity</FieldLabel>
            <Input
              aria-invalid={!!errors.quantity}
              autoComplete="off"
              id="adjust-quantity"
              inputMode="numeric"
              placeholder="0"
              {...form.register("quantity")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <SimpleSelect
                  id="adjust-reason"
                  onChange={field.onChange}
                  options={MANUAL_REASONS.map((value) => ({
                    value,
                    label: REASON_LABELS[value],
                  }))}
                  value={field.value}
                />
              )}
            />
          </Field>
        </div>
        <FieldError errors={[errors.quantity]} />
        <dl className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center text-sm">
          {[
            {
              label: "On hand",
              before: row.quantityOnHand,
              after: onHandAfter,
            },
            {
              label: "Reserved",
              before: row.quantityReserved,
              after: row.quantityReserved,
            },
            {
              label: "Available",
              before: row.available,
              after: row.available + delta,
            },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {item.before === item.after ? (
                  item.after
                ) : (
                  <>
                    <span className="text-muted-foreground">{item.before}</span>
                    {" → "}
                    <span
                      className={cn(
                        item.after < 0 ||
                          (item.label === "On hand" && belowReserved)
                          ? "text-destructive"
                          : undefined,
                      )}
                    >
                      {item.after}
                    </span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {belowReserved ? (
          <p className="text-sm text-destructive" role="alert">
            Stock can't go below the {row.quantityReserved} units reserved for
            open orders. You can remove at most{" "}
            {Math.max(row.quantityOnHand - row.quantityReserved, 0)}.
          </p>
        ) : null}
        <Field data-invalid={!!errors.note}>
          <FieldLabel htmlFor="adjust-note">Note</FieldLabel>
          <Textarea
            aria-invalid={!!errors.note}
            id="adjust-note"
            placeholder="Optional, such as a supplier invoice or count reference"
            rows={2}
            {...form.register("note")}
          />
          <FieldDescription>Saved with the stock history.</FieldDescription>
          <FieldError errors={[errors.note]} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button
          disabled={adjust.isPending}
          onClick={onDone}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={adjust.isPending || belowReserved} type="submit">
          {adjust.isPending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : null}
          Save change
        </Button>
      </DialogFooter>
    </form>
  );
}
