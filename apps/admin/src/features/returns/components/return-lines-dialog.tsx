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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import { Textarea } from "@eshanika/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type ReturnLine = {
  id: string;
  name: string;
  detail: string;
  max: number;
};

export type ReturnLinesSubmit = {
  idempotencyKey: string;
  reason: string;
  items: { orderItemId: string; quantity: number }[];
};

type Copy = {
  title: string;
  description: string;
  submitLabel: string;
  maxLabel: string;
};

function linesFormSchema(lines: ReturnLine[], withReason: boolean) {
  const max = new Map(lines.map((line) => [line.id, line.max]));
  return z
    .object({
      items: z.array(
        z.object({
          orderItemId: z.string(),
          selected: z.boolean(),
          quantity: z.string().trim(),
        }),
      ),
      reason: withReason
        ? z
            .string()
            .trim()
            .min(1, "Say why the items are coming back")
            .max(1000, "Keep the reason under 1,000 characters")
        : z.string(),
    })
    .superRefine((values, context) => {
      if (!values.items.some((item) => item.selected)) {
        context.addIssue({
          code: "custom",
          path: ["items"],
          message: "Choose at least one item",
        });
      }
      values.items.forEach((item, index) => {
        if (!item.selected) return;
        const limit = max.get(item.orderItemId) ?? 0;
        const quantity = /^\d{1,6}$/.test(item.quantity)
          ? Number(item.quantity)
          : 0;
        if (quantity < 1 || quantity > limit) {
          context.addIssue({
            code: "custom",
            path: ["items", index, "quantity"],
            message: `Enter 1 to ${limit}`,
          });
        }
      });
    });
}

type LinesFormValues = z.input<ReturnType<typeof linesFormSchema>>;

// One idempotency key per opening; a retried submit reuses it, so the work happens once.
export function ReturnLinesDialog({
  open,
  onOpenChange,
  ...formProps
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & Omit<LinesFormProps, "idempotencyKey" | "onCancel">) {
  const [key, setKey] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setKey(crypto.randomUUID());
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!formProps.pending) onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {key ? (
          <LinesForm
            {...formProps}
            idempotencyKey={key}
            key={key}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type LinesFormProps = {
  lines: ReturnLine[];
  copy: Copy;
  withReason: boolean;
  pending: boolean;
  error: string | null;
  idempotencyKey: string;
  onSubmit: (values: ReturnLinesSubmit) => void;
  onCancel: () => void;
};

function LinesForm({
  lines,
  copy,
  withReason,
  pending,
  error,
  idempotencyKey,
  onSubmit,
  onCancel,
}: LinesFormProps) {
  const schema = linesFormSchema(lines, withReason);
  const form = useForm<LinesFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: lines.map((line) => ({
        orderItemId: line.id,
        selected: lines.length === 1,
        quantity: String(line.max),
      })),
      reason: "",
    },
  });
  const { errors } = form.formState;
  const items = form.watch("items");

  return (
    <form
      className="grid grid-cols-1 gap-6"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const parsed = schema.parse(values);
        onSubmit({
          idempotencyKey,
          reason: parsed.reason,
          items: parsed.items
            .filter((item) => item.selected)
            .map((item) => ({
              orderItemId: item.orderItemId,
              quantity: Number(item.quantity),
            })),
        });
      })}
    >
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="gap-5">
        {error ? (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Items</legend>
          <ul className="divide-y rounded-lg border">
            {lines.map((line, index) => {
              const quantityError = errors.items?.[index]?.quantity;
              return (
                <li className="flex items-center gap-3 px-3 py-2" key={line.id}>
                  <Checkbox
                    aria-label={`Include ${line.name}`}
                    checked={items[index]?.selected ?? false}
                    id={`line-${line.id}`}
                    onCheckedChange={(checked) =>
                      form.setValue(`items.${index}.selected`, checked, {
                        shouldValidate: form.formState.isSubmitted,
                      })
                    }
                  />
                  <label
                    className="min-w-0 flex-1 text-sm"
                    htmlFor={`line-${line.id}`}
                  >
                    <span className="block truncate font-medium">
                      {line.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {line.detail} · {line.max} {copy.maxLabel}
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
              ...lines.map((_, index) => errors.items?.[index]?.quantity),
            ]}
          />
        </fieldset>
        {withReason ? (
          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="return-reason">Reason</FieldLabel>
            <Textarea
              aria-invalid={!!errors.reason}
              id="return-reason"
              placeholder="For example, the size didn't fit"
              rows={3}
              {...form.register("reason")}
            />
            <FieldDescription>Only the team sees this.</FieldDescription>
            <FieldError errors={[errors.reason]} />
          </Field>
        ) : null}
      </FieldGroup>
      <DialogFooter>
        <Button
          disabled={pending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={pending} type="submit">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {copy.submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
