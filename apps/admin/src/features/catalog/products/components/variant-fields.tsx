"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@eshanika/ui/components/field";
import { Input } from "@eshanika/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@eshanika/ui/components/input-group";
import { Switch } from "@eshanika/ui/components/switch";
import { Controller, useFormContext } from "react-hook-form";
import { SimpleSelect } from "@/components/patterns/simple-select";
import type { ProductFormValues } from "./product-form-model";

type VariantPath = `variants.${number}`;

function PriceInput({
  id,
  name,
  placeholder,
}: {
  id: string;
  name: `${VariantPath}.regularPrice` | `${VariantPath}.salePrice`;
  placeholder: string;
}) {
  const { register, getFieldState, formState } =
    useFormContext<ProductFormValues>();
  const { error } = getFieldState(name, formState);
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>₹</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        aria-invalid={!!error}
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        {...register(name)}
      />
    </InputGroup>
  );
}

// Pricing, sale window, stock, and shipping fields for one variant.
export function VariantFields({ index }: { index: number }) {
  const { register, control, getFieldState, formState } =
    useFormContext<ProductFormValues>();
  const path = `variants.${index}` as const;
  const id = (field: string) => `variant-${index}-${field}`;
  const error = (field: keyof ProductFormValues["variants"][number]) =>
    getFieldState(`${path}.${field}`, formState).error;

  return (
    <FieldGroup className="gap-7">
      <FieldSet>
        <FieldLegend variant="label">Pricing</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!error("regularPrice")}>
            <FieldLabel htmlFor={id("regular")}>Regular price</FieldLabel>
            <PriceInput
              id={id("regular")}
              name={`${path}.regularPrice`}
              placeholder="2499"
            />
            <FieldError errors={[error("regularPrice")]} />
          </Field>
          <Field data-invalid={!!error("salePrice")}>
            <FieldLabel htmlFor={id("sale")}>Sale price</FieldLabel>
            <PriceInput
              id={id("sale")}
              name={`${path}.salePrice`}
              placeholder="Optional"
            />
            <FieldError errors={[error("salePrice")]} />
          </Field>
          <Field>
            <FieldLabel htmlFor={id("sale-start")}>Sale starts</FieldLabel>
            <Input
              id={id("sale-start")}
              type="datetime-local"
              {...register(`${path}.saleStartsAt`)}
            />
          </Field>
          <Field data-invalid={!!error("saleEndsAt")}>
            <FieldLabel htmlFor={id("sale-end")}>Sale ends</FieldLabel>
            <Input
              aria-invalid={!!error("saleEndsAt")}
              id={id("sale-end")}
              type="datetime-local"
              {...register(`${path}.saleEndsAt`)}
            />
            <FieldError errors={[error("saleEndsAt")]} />
          </Field>
        </div>
        <FieldDescription>
          Sale dates are India time. Leave them empty to run the sale until you
          remove the sale price. The store calculates the final price.
        </FieldDescription>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Stock</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={id("stock-status")}>Availability</FieldLabel>
            <Controller
              control={control}
              name={`${path}.stockStatus`}
              render={({ field }) => (
                <SimpleSelect
                  id={id("stock-status")}
                  onChange={field.onChange}
                  options={[
                    { value: "in_stock", label: "In stock" },
                    { value: "out_of_stock", label: "Out of stock" },
                  ]}
                  value={field.value}
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={id("backorders")}>Backorders</FieldLabel>
            <Controller
              control={control}
              name={`${path}.backorderPolicy`}
              render={({ field }) => (
                <SimpleSelect
                  id={id("backorders")}
                  onChange={field.onChange}
                  options={[
                    { value: "no", label: "Don't allow" },
                    { value: "notify", label: "Allow, tell the shopper" },
                    { value: "allow", label: "Allow" },
                  ]}
                  value={field.value}
                />
              )}
            />
          </Field>
        </div>
        <Controller
          control={control}
          name={`${path}.manageStock`}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                checked={field.value}
                id={id("manage-stock")}
                onCheckedChange={field.onChange}
              />
              <FieldLabel className="font-normal" htmlFor={id("manage-stock")}>
                Track stock quantity for this variant
              </FieldLabel>
            </Field>
          )}
        />
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Shipping</FieldLegend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              ["weight", "Weight", "kg"],
              ["length", "Length", "cm"],
              ["width", "Width", "cm"],
              ["height", "Height", "cm"],
            ] as const
          ).map(([field, label, unit]) => (
            <Field data-invalid={!!error(field)} key={field}>
              <FieldLabel htmlFor={id(field)}>{label}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  aria-invalid={!!error(field)}
                  id={id(field)}
                  inputMode="decimal"
                  {...register(`${path}.${field}`)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>{unit}</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldError errors={[error(field)]} />
            </Field>
          ))}
        </div>
      </FieldSet>
    </FieldGroup>
  );
}
