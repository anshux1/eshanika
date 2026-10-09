"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/patterns/page-header";
import {
  ErrorState,
  errorMessage,
  LoadingState,
} from "@/components/patterns/page-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { formatInr, rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";

type Fee = NonNullable<RouterOutputs["fees"]["cod"]>;

const feeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the fee as customers will see it")
    .max(120, "Keep the name under 120 characters"),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 49 or 49.50")
    .refine((value) => rupeesToPaise(value) > 0, "Enter more than zero"),
  taxable: z.boolean(),
});

type FeeFormValues = z.input<typeof feeFormSchema>;

function defaultsFor(fee: Fee | null): FeeFormValues {
  return {
    name: fee?.name ?? "Cash on delivery fee",
    amount: fee?.amount ?? "",
    taxable: fee?.taxable ?? false,
  };
}

export function CodFeeView() {
  const fee = useQuery(orpc.fees.cod.queryOptions());

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        description="Extra charges added at checkout. Placed orders keep the fee they were charged."
        title="Fees"
      />
      {fee.isPending ? (
        <LoadingState rows={4} />
      ) : fee.isError ? (
        <ErrorState error={fee.error} onRetry={() => fee.refetch()} />
      ) : (
        <CodFeeForm fee={fee.data} key={fee.data?.id ?? "new"} />
      )}
    </div>
  );
}

function CodFeeForm({ fee }: { fee: Fee | null }) {
  const queryClient = useQueryClient();
  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: defaultsFor(fee),
  });
  const { errors, isDirty } = form.formState;
  useUnsavedChanges(isDirty);
  const onSettled = () =>
    queryClient.invalidateQueries({ queryKey: orpc.fees.key() });
  const onError = (error: unknown) =>
    form.setError("root", { message: errorMessage(error) });
  const create = useMutation(
    orpc.fees.createCod.mutationOptions({
      onSuccess: (saved) => {
        form.reset(defaultsFor(saved));
        toast.success("Fee saved. It stays off until you turn it on.");
      },
      onError,
      onSettled,
    }),
  );
  const update = useMutation(
    orpc.fees.updateCod.mutationOptions({
      onSuccess: (saved, variables) => {
        form.reset(defaultsFor(saved));
        toast.success(
          fee && variables.enabled !== fee.enabled
            ? saved.enabled
              ? `Checkout now adds ${formatInr(saved.amount)} for cash on delivery`
              : "Cash on delivery fee turned off"
            : "Fee saved",
        );
      },
      onError,
      onSettled,
    }),
  );
  const pending = create.isPending || update.isPending;

  function save(values: FeeFormValues, enabled: boolean) {
    const parsed = feeFormSchema.parse(values);
    if (!fee) return create.mutate(parsed);
    update.mutate({
      ...parsed,
      id: fee.id,
      enabled,
      expectedUpdatedAt: new Date(fee.updatedAt).toISOString(),
    });
  }

  return (
    <Card>
      <form
        className="contents"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          save(values, fee?.enabled ?? false),
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cash on delivery
            {fee ? (
              <StatusBadge tone={fee.enabled ? "success" : "muted"}>
                {fee.enabled ? "On" : "Off"}
              </StatusBadge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Added to orders paid in cash when the parcel arrives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-5">
            {errors.root ? (
              <p
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errors.root.message}
              </p>
            ) : null}
            {fee ? (
              <Field orientation="horizontal">
                <Switch
                  checked={fee.enabled}
                  disabled={pending || isDirty}
                  id="fee-enabled"
                  onCheckedChange={(enabled) => save(form.getValues(), enabled)}
                />
                <div>
                  <FieldLabel className="font-normal" htmlFor="fee-enabled">
                    Charge this fee at checkout
                  </FieldLabel>
                  {isDirty ? (
                    <FieldDescription>
                      Save your changes before turning it on or off.
                    </FieldDescription>
                  ) : null}
                </div>
              </Field>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="fee-name">Name at checkout</FieldLabel>
                <Input
                  aria-invalid={!!errors.name}
                  id="fee-name"
                  {...form.register("name")}
                />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.amount}>
                <FieldLabel htmlFor="fee-amount">Amount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-invalid={!!errors.amount}
                    id="fee-amount"
                    inputMode="decimal"
                    placeholder="49"
                    {...form.register("amount")}
                  />
                </InputGroup>
                <FieldError errors={[errors.amount]} />
              </Field>
            </div>
            <Controller
              control={form.control}
              name="taxable"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch
                    checked={field.value}
                    id="fee-taxable"
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel className="font-normal" htmlFor="fee-taxable">
                    Charge tax on this fee
                  </FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            disabled={pending || (fee !== null && !isDirty)}
            type="submit"
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {fee ? "Save changes" : "Save fee"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
