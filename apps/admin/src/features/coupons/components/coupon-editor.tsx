"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import { errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { fromIstInputValue, toIstInputValue } from "@/lib/format";
import { rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import { type Coupon, CouponStateBadge } from "./coupon-badges";
import { CouponRedemptions } from "./coupon-redemptions";

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;
const WHOLE = /^\d{1,8}$/;

const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Use at least 3 characters")
      .max(40, "Keep the code under 40 characters")
      .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, dashes, or underscores"),
    kind: z.enum(["percentage", "fixed"]),
    value: z.string().trim().regex(MONEY, "Enter a number like 10 or 10.5"),
    maximumDiscount: z
      .string()
      .trim()
      .refine((value) => !value || MONEY.test(value), "Enter an amount"),
    minimumSubtotal: z
      .string()
      .trim()
      .refine((value) => !value || MONEY.test(value), "Enter an amount"),
    startsAt: z.string().min(1, "Choose when the coupon starts"),
    expiresAt: z.string(),
    usageLimit: z
      .string()
      .trim()
      .refine(
        (value) => !value || (WHOLE.test(value) && Number(value) > 0),
        "Enter a whole number above zero, or leave it empty",
      ),
    perUserLimit: z
      .string()
      .trim()
      .refine(
        (value) =>
          WHOLE.test(value) && Number(value) >= 1 && Number(value) <= 1000,
        "Enter 1 to 1,000",
      ),
    freeShipping: z.boolean(),
  })
  .superRefine((values, context) => {
    if (MONEY.test(values.value)) {
      const value = rupeesToPaise(values.value);
      if (values.kind === "percentage" && (value < 100 || value > 10_000))
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "Enter a percentage from 1 to 100",
        });
      if (values.kind === "fixed" && value <= 0)
        context.addIssue({
          code: "custom",
          path: ["value"],
          message: "Enter an amount above zero",
        });
    }
    if (
      values.maximumDiscount &&
      MONEY.test(values.maximumDiscount) &&
      rupeesToPaise(values.maximumDiscount) <= 0
    )
      context.addIssue({
        code: "custom",
        path: ["maximumDiscount"],
        message: "Enter an amount above zero, or leave it empty",
      });
    if (
      values.expiresAt &&
      values.startsAt &&
      values.expiresAt <= values.startsAt
    )
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "End after the start date",
      });
  });

type CouponFormValues = z.input<typeof couponFormSchema>;

function defaultsFor(coupon: Coupon | null): CouponFormValues {
  if (!coupon) {
    return {
      code: "",
      kind: "percentage",
      value: "",
      maximumDiscount: "",
      minimumSubtotal: "",
      startsAt: toIstInputValue(new Date().toISOString()),
      expiresAt: "",
      usageLimit: "",
      perUserLimit: "1",
      freeShipping: false,
    };
  }
  return {
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    maximumDiscount: coupon.maximumDiscount ?? "",
    minimumSubtotal:
      rupeesToPaise(coupon.minimumSubtotal) > 0 ? coupon.minimumSubtotal : "",
    startsAt: toIstInputValue(new Date(coupon.startsAt).toISOString()),
    expiresAt: coupon.expiresAt
      ? toIstInputValue(new Date(coupon.expiresAt).toISOString())
      : "",
    usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    perUserLimit: String(coupon.perUserLimit),
    freeShipping: coupon.freeShipping,
  };
}

function toInput(values: z.output<typeof couponFormSchema>) {
  return {
    code: values.code,
    kind: values.kind,
    value: values.value,
    // A cap only limits percentage discounts.
    maximumDiscount:
      values.kind === "percentage" && values.maximumDiscount
        ? values.maximumDiscount
        : null,
    minimumSubtotal: values.minimumSubtotal || "0",
    startsAt: fromIstInputValue(values.startsAt) ?? new Date().toISOString(),
    expiresAt: fromIstInputValue(values.expiresAt),
    usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
    perUserLimit: Number(values.perUserLimit),
    freeShipping: values.freeShipping,
  };
}

export function CouponEditor({
  initialCoupon,
}: {
  initialCoupon: Coupon | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [coupon, setCoupon] = useState(initialCoupon);
  const [archiving, setArchiving] = useState(false);
  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: defaultsFor(initialCoupon),
  });
  const { errors, isDirty } = form.formState;
  const kind = form.watch("kind");
  const readOnly = Boolean(coupon?.archivedAt);
  const locked = (coupon?.redemptionCount ?? 0) > 0;
  useUnsavedChanges(isDirty && !readOnly);

  function saved(next: Coupon, message: string) {
    setCoupon(next);
    form.reset(defaultsFor(next));
    void queryClient.invalidateQueries({ queryKey: orpc.coupons.key() });
    toast.success(message);
  }

  const create = useMutation(
    orpc.coupons.create.mutationOptions({
      onSuccess: (next) => {
        form.reset(defaultsFor(next));
        void queryClient.invalidateQueries({ queryKey: orpc.coupons.key() });
        toast.success(`${next.code} created`);
        router.replace(`/coupons/${next.id}`);
      },
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
    }),
  );
  const update = useMutation(
    orpc.coupons.update.mutationOptions({
      onSuccess: (next) => saved(next, "Coupon saved"),
      onError: (error) =>
        form.setError("root", { message: errorMessage(error) }),
    }),
  );
  const archive = useMutation(
    orpc.coupons.archive.mutationOptions({
      onSuccess: (next) => {
        setArchiving(false);
        saved(next, `${next.code} archived`);
      },
      onError: (error) => {
        setArchiving(false);
        toast.error(errorMessage(error));
      },
    }),
  );
  const pending = create.isPending || update.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const input = toInput(couponFormSchema.parse(values));
    if (!coupon) return create.mutate(input);
    update.mutate({
      ...input,
      id: coupon.id,
      expectedUpdatedAt: new Date(coupon.updatedAt).toISOString(),
    });
  });

  return (
    <form className="mx-auto w-full max-w-6xl" noValidate onSubmit={onSubmit}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label="Back to coupons"
            nativeButton={false}
            render={
              <Link href="/coupons">
                <ArrowLeft aria-hidden />
              </Link>
            }
            size="icon"
            variant="outline"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-mono text-2xl font-semibold tracking-tight">
                {coupon ? coupon.code : "New coupon"}
              </h1>
              {coupon ? <CouponStateBadge coupon={coupon} /> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {coupon
                ? `Used ${coupon.redemptionCount} time${coupon.redemptionCount === 1 ? "" : "s"}`
                : "Customers type this code at checkout."}
            </p>
          </div>
        </div>
        {readOnly ? null : (
          <div className="flex shrink-0 gap-2">
            {coupon ? (
              <Button
                disabled={pending}
                onClick={() => setArchiving(true)}
                type="button"
                variant="outline"
              >
                <Archive aria-hidden />
                Archive
              </Button>
            ) : null}
            <Button
              disabled={pending || (coupon !== null && !isDirty)}
              type="submit"
            >
              {pending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {coupon ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        )}
      </div>

      {readOnly ? (
        <p className="mb-6 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          This coupon is archived. Customers can't use it, and it can't be
          changed.
        </p>
      ) : null}
      {errors.root ? (
        <p
          className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errors.root.message}
        </p>
      ) : null}

      <fieldset
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
        disabled={readOnly}
      >
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discount</CardTitle>
              {locked ? (
                <CardDescription>
                  Customers have used this coupon, so its type and value are
                  locked.
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-5">
                <Field data-invalid={!!errors.code}>
                  <FieldLabel htmlFor="coupon-code">Code</FieldLabel>
                  <Input
                    aria-invalid={!!errors.code}
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="font-mono uppercase"
                    id="coupon-code"
                    placeholder="DIWALI10"
                    {...form.register("code")}
                  />
                  <FieldDescription>
                    Saved in capitals. Customers can type it in any case.
                  </FieldDescription>
                  <FieldError errors={[errors.code]} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="coupon-kind">Type</FieldLabel>
                    <Controller
                      control={form.control}
                      name="kind"
                      render={({ field }) => (
                        <SimpleSelect
                          disabled={locked || readOnly}
                          id="coupon-kind"
                          onChange={field.onChange}
                          options={[
                            { value: "percentage", label: "Percentage off" },
                            { value: "fixed", label: "Fixed amount off" },
                          ]}
                          value={field.value}
                        />
                      )}
                    />
                  </Field>
                  <Field data-invalid={!!errors.value}>
                    <FieldLabel htmlFor="coupon-value">
                      {kind === "percentage" ? "Percentage" : "Amount"}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon
                        align={kind === "percentage" ? "inline-end" : undefined}
                      >
                        <InputGroupText>
                          {kind === "percentage" ? "%" : "₹"}
                        </InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-invalid={!!errors.value}
                        disabled={locked}
                        id="coupon-value"
                        inputMode="decimal"
                        placeholder={kind === "percentage" ? "10" : "200"}
                        {...form.register("value")}
                      />
                    </InputGroup>
                    <FieldError errors={[errors.value]} />
                  </Field>
                </div>
                {kind === "percentage" ? (
                  <Field data-invalid={!!errors.maximumDiscount}>
                    <FieldLabel htmlFor="coupon-max">
                      Maximum discount
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>₹</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-invalid={!!errors.maximumDiscount}
                        id="coupon-max"
                        inputMode="decimal"
                        placeholder="No cap"
                        {...form.register("maximumDiscount")}
                      />
                    </InputGroup>
                    <FieldDescription>
                      The most a single order can save.
                    </FieldDescription>
                    <FieldError errors={[errors.maximumDiscount]} />
                  </Field>
                ) : null}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>
                Checked at checkout. Leave a field empty for no limit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-5">
                <Field data-invalid={!!errors.minimumSubtotal}>
                  <FieldLabel htmlFor="coupon-minimum">
                    Minimum cart value
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>₹</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-invalid={!!errors.minimumSubtotal}
                      id="coupon-minimum"
                      inputMode="decimal"
                      placeholder="Any amount"
                      {...form.register("minimumSubtotal")}
                    />
                  </InputGroup>
                  <FieldError errors={[errors.minimumSubtotal]} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field data-invalid={!!errors.usageLimit}>
                    <FieldLabel htmlFor="coupon-usage">Total uses</FieldLabel>
                    <Input
                      aria-invalid={!!errors.usageLimit}
                      id="coupon-usage"
                      inputMode="numeric"
                      placeholder="Unlimited"
                      {...form.register("usageLimit")}
                    />
                    <FieldError errors={[errors.usageLimit]} />
                  </Field>
                  <Field data-invalid={!!errors.perUserLimit}>
                    <FieldLabel htmlFor="coupon-per-user">
                      Uses per customer
                    </FieldLabel>
                    <Input
                      aria-invalid={!!errors.perUserLimit}
                      id="coupon-per-user"
                      inputMode="numeric"
                      {...form.register("perUserLimit")}
                    />
                    <FieldError errors={[errors.perUserLimit]} />
                  </Field>
                </div>
                <Controller
                  control={form.control}
                  name="freeShipping"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Switch
                        checked={field.value}
                        disabled={readOnly}
                        id="coupon-free-shipping"
                        onCheckedChange={field.onChange}
                      />
                      <FieldLabel
                        className="font-normal"
                        htmlFor="coupon-free-shipping"
                      >
                        Also unlocks free shipping methods that need a coupon
                      </FieldLabel>
                    </Field>
                  )}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Times are India time.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-5">
                <Field data-invalid={!!errors.startsAt}>
                  <FieldLabel htmlFor="coupon-starts">Starts</FieldLabel>
                  <Input
                    aria-invalid={!!errors.startsAt}
                    id="coupon-starts"
                    type="datetime-local"
                    {...form.register("startsAt")}
                  />
                  <FieldError errors={[errors.startsAt]} />
                </Field>
                <Field data-invalid={!!errors.expiresAt}>
                  <FieldLabel htmlFor="coupon-ends">Ends</FieldLabel>
                  <Input
                    aria-invalid={!!errors.expiresAt}
                    id="coupon-ends"
                    type="datetime-local"
                    {...form.register("expiresAt")}
                  />
                  <FieldDescription>Leave empty to never end.</FieldDescription>
                  <FieldError errors={[errors.expiresAt]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </fieldset>

      {coupon ? (
        <div className="mt-6">
          <CouponRedemptions couponId={coupon.id} />
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Archive"
        description="Customers can't use it any more. Its history stays, and archived coupons can't be edited."
        destructive
        onConfirm={() => {
          if (!coupon) return;
          archive.mutate({
            id: coupon.id,
            expectedUpdatedAt: new Date(coupon.updatedAt).toISOString(),
          });
        }}
        onOpenChange={setArchiving}
        open={archiving}
        pending={archive.isPending}
        title={`Archive ${coupon?.code ?? "coupon"}?`}
      />
    </form>
  );
}
