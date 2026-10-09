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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { formatInr, rupeesToPaise } from "@/lib/money";
import { orpc } from "@/orpc/query";
import { INDIAN_STATES } from "../indian-states";

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

const quoteFormSchema = z.object({
  subtotal: z.string().trim().regex(MONEY, "Enter an amount like 999"),
  discount: z
    .string()
    .trim()
    .refine((value) => !value || MONEY.test(value), "Enter an amount"),
  state: z.enum(INDIAN_STATES),
  couponCode: z.string().trim().max(40, "Codes are 40 characters at most"),
});

// Asks the same quote service checkout will use, against live settings.
export function QuotePreview() {
  const form = useForm<z.input<typeof quoteFormSchema>>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      subtotal: "999",
      discount: "",
      state: "Maharashtra",
      couponCode: "",
    },
  });
  const { errors } = form.formState;
  const quote = useMutation(orpc.shipping.quote.mutationOptions());
  const result = quote.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview checkout</CardTitle>
        <CardDescription>
          See which methods a cart gets. Only enabled zones and methods count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            const parsed = quoteFormSchema.parse(values);
            quote.mutate({
              subtotal: parsed.subtotal,
              discount: parsed.discount || "0",
              state: parsed.state,
              couponCode: parsed.couponCode || undefined,
            });
          })}
        >
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.subtotal}>
                <FieldLabel htmlFor="quote-subtotal">Cart value</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-invalid={!!errors.subtotal}
                    id="quote-subtotal"
                    inputMode="decimal"
                    {...form.register("subtotal")}
                  />
                </InputGroup>
                <FieldError errors={[errors.subtotal]} />
              </Field>
              <Field data-invalid={!!errors.discount}>
                <FieldLabel htmlFor="quote-discount">Discount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>₹</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-invalid={!!errors.discount}
                    id="quote-discount"
                    inputMode="decimal"
                    placeholder="0"
                    {...form.register("discount")}
                  />
                </InputGroup>
                <FieldError errors={[errors.discount]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="quote-state">Delivery state</FieldLabel>
              <Controller
                control={form.control}
                name="state"
                render={({ field }) => (
                  <SimpleSelect
                    id="quote-state"
                    onChange={field.onChange}
                    options={INDIAN_STATES.map((state) => ({
                      value: state,
                      label: state,
                    }))}
                    value={field.value}
                  />
                )}
              />
            </Field>
            <Field data-invalid={!!errors.couponCode}>
              <FieldLabel htmlFor="quote-coupon">Coupon code</FieldLabel>
              <Input
                aria-invalid={!!errors.couponCode}
                className="font-mono uppercase"
                id="quote-coupon"
                placeholder="Optional"
                {...form.register("couponCode")}
              />
              <FieldError errors={[errors.couponCode]} />
            </Field>
          </FieldGroup>
          <Button className="w-full" disabled={quote.isPending} type="submit">
            {quote.isPending ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : null}
            Show methods
          </Button>
        </form>
        <div aria-live="polite">
          {quote.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage(quote.error)}
            </p>
          ) : result ? (
            result.zone === null ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                No enabled zone covers this state, so checkout can't ship here.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Uses{" "}
                  <span className="font-medium text-foreground">
                    {result.zone.name}
                  </span>
                </p>
                {result.methods.length === 0 ? (
                  <p className="rounded-lg bg-muted/60 px-3 py-2">
                    No method is available for this cart.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {result.methods.map((method) => (
                      <li
                        className="flex items-center justify-between gap-3 px-3 py-2"
                        key={method.id}
                      >
                        <span className="min-w-0 truncate">{method.title}</span>
                        <span className="shrink-0 tabular-nums">
                          {rupeesToPaise(method.cost) === 0
                            ? "Free"
                            : formatInr(method.cost)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
