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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@eshanika/ui/components/input-group";
import { Switch } from "@eshanika/ui/components/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import type { Zone } from "./zone-dialog";

export type Method = Zone["shippingMethods"][number];

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

export const METHOD_KIND_LABELS = {
  flat_rate: "Flat rate",
  free_shipping: "Free shipping",
} as const;

export const REQUIREMENT_LABELS = {
  none: "No requirement",
  minimum_subtotal: "Minimum cart value",
  coupon: "A free-shipping coupon",
} as const;

const methodFormSchema = z
  .object({
    kind: z.enum(["flat_rate", "free_shipping"]),
    title: z
      .string()
      .trim()
      .min(1, "Name the method as customers will see it")
      .max(120, "Keep the name under 120 characters"),
    cost: z.string().trim(),
    requirement: z.enum(["none", "minimum_subtotal", "coupon"]),
    minimumSubtotal: z.string().trim(),
    ignoreDiscounts: z.boolean(),
    taxable: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.kind === "flat_rate" && !MONEY.test(values.cost))
      context.addIssue({
        code: "custom",
        path: ["cost"],
        message: "Enter a cost like 79 or 79.50",
      });
    if (
      values.requirement === "minimum_subtotal" &&
      !(
        MONEY.test(values.minimumSubtotal) &&
        rupeesToPaise(values.minimumSubtotal) > 0
      )
    )
      context.addIssue({
        code: "custom",
        path: ["minimumSubtotal"],
        message: "Enter the minimum cart value",
      });
  });

type MethodFormValues = z.input<typeof methodFormSchema>;

export function MethodDialog({
  zone,
  method,
  onClose,
}: {
  zone: Zone;
  method: Method | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<MethodFormValues>({
    resolver: zodResolver(methodFormSchema),
    defaultValues: {
      kind: method?.kind ?? "flat_rate",
      title: method?.title ?? "",
      cost: method && method.kind === "flat_rate" ? method.cost : "",
      requirement: method?.requirement ?? "none",
      minimumSubtotal: method?.minimumSubtotal ?? "",
      ignoreDiscounts: method?.ignoreDiscounts ?? false,
      taxable: method?.taxable ?? false,
    },
  });
  const { errors } = form.formState;
  const kind = form.watch("kind");
  const requirement = form.watch("requirement");
  const options = {
    onError: (error: unknown) =>
      form.setError("root", { message: errorMessage(error) }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: orpc.shipping.key() }),
  };
  const create = useMutation(
    orpc.shipping.methods.create.mutationOptions({
      ...options,
      onSuccess: (saved) => {
        toast.success(`${saved.title} added. Turn it on when it's ready.`);
        onClose();
      },
    }),
  );
  const update = useMutation(
    orpc.shipping.methods.update.mutationOptions({
      ...options,
      onSuccess: () => {
        toast.success("Method saved");
        onClose();
      },
    }),
  );
  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      open
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            const parsed = methodFormSchema.parse(values);
            const fields = {
              ...parsed,
              cost: parsed.kind === "flat_rate" ? parsed.cost : "0",
              minimumSubtotal:
                parsed.requirement === "minimum_subtotal"
                  ? parsed.minimumSubtotal
                  : null,
            };
            if (!method) return create.mutate({ ...fields, zoneId: zone.id });
            update.mutate({
              ...fields,
              id: method.id,
              enabled: method.enabled,
              expectedUpdatedAt: new Date(method.updatedAt).toISOString(),
            });
          })}
        >
          <DialogHeader>
            <DialogTitle>
              {method ? `Edit ${method.title}` : `New method in ${zone.name}`}
            </DialogTitle>
            <DialogDescription>
              Checkout shows the methods whose requirement the cart meets.
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
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="method-kind">Type</FieldLabel>
                <Controller
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <SimpleSelect
                      id="method-kind"
                      onChange={field.onChange}
                      options={Object.entries(METHOD_KIND_LABELS).map(
                        ([value, label]) => ({
                          value: value as keyof typeof METHOD_KIND_LABELS,
                          label,
                        }),
                      )}
                      value={field.value}
                    />
                  )}
                />
              </Field>
              {kind === "flat_rate" ? (
                <Field data-invalid={!!errors.cost}>
                  <FieldLabel htmlFor="method-cost">Cost</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>₹</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={!!errors.cost}
                      id="method-cost"
                      inputMode="decimal"
                      placeholder="79"
                      {...form.register("cost")}
                    />
                  </InputGroup>
                  <FieldError errors={[errors.cost]} />
                </Field>
              ) : null}
            </div>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="method-title">Name at checkout</FieldLabel>
              <Input
                aria-invalid={!!errors.title}
                id="method-title"
                placeholder={
                  kind === "flat_rate" ? "Standard delivery" : "Free delivery"
                }
                {...form.register("title")}
              />
              <FieldError errors={[errors.title]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="method-requirement">
                Available when
              </FieldLabel>
              <Controller
                control={form.control}
                name="requirement"
                render={({ field }) => (
                  <SimpleSelect
                    id="method-requirement"
                    onChange={field.onChange}
                    options={Object.entries(REQUIREMENT_LABELS).map(
                      ([value, label]) => ({
                        value: value as keyof typeof REQUIREMENT_LABELS,
                        label,
                      }),
                    )}
                    value={field.value}
                  />
                )}
              />
            </Field>
            {requirement === "minimum_subtotal" ? (
              <>
                <Field data-invalid={!!errors.minimumSubtotal}>
                  <FieldLabel htmlFor="method-minimum">
                    Minimum cart value
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>₹</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={!!errors.minimumSubtotal}
                      id="method-minimum"
                      inputMode="decimal"
                      placeholder="999"
                      {...form.register("minimumSubtotal")}
                    />
                  </InputGroup>
                  <FieldError errors={[errors.minimumSubtotal]} />
                </Field>
                <Controller
                  control={form.control}
                  name="ignoreDiscounts"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Switch
                        checked={field.value}
                        id="method-ignore-discounts"
                        onCheckedChange={field.onChange}
                      />
                      <FieldLabel
                        className="font-normal"
                        htmlFor="method-ignore-discounts"
                      >
                        Compare the cart value before coupon discounts
                      </FieldLabel>
                    </Field>
                  )}
                />
              </>
            ) : null}
            <Controller
              control={form.control}
              name="taxable"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch
                    checked={field.value}
                    id="method-taxable"
                    onCheckedChange={field.onChange}
                  />
                  <div>
                    <FieldLabel
                      className="font-normal"
                      htmlFor="method-taxable"
                    >
                      Charge tax on shipping
                    </FieldLabel>
                    <FieldDescription>
                      Only matters for paid methods.
                    </FieldDescription>
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {method ? "Save method" : "Add method"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
