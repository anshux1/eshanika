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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import type { Attribute } from "./attribute-dialog";
import { nameField, slugField, toNullable } from "./form-schemas";
import { NameSlugFields } from "./name-slug-fields";

export type AttributeOption =
  RouterOutputs["catalog"]["attributes"]["options"]["list"]["items"][number];

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function schemaFor(requiresSwatch: boolean) {
  return z.object({
    name: nameField,
    slug: slugField,
    swatchValue: z
      .string()
      .trim()
      .refine((value) => (value ? HEX.test(value) : !requiresSwatch), {
        message: requiresSwatch
          ? "Pick a colour, like #C9A227"
          : "Use a hex colour, like #C9A227",
      }),
  });
}

type Values = z.infer<ReturnType<typeof schemaFor>>;

// Native colour pickers only understand six-digit hex.
function toSixDigitHex(value: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${[...value.slice(1)].map((char) => char + char).join("")}`;
  }
  return "#c9a227";
}

export function OptionDialog({
  attribute,
  option,
  onClose,
}: {
  attribute: Attribute;
  option: AttributeOption | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const requiresSwatch = attribute.displayType === "swatch";
  const form = useForm<Values>({
    resolver: zodResolver(schemaFor(requiresSwatch)),
    defaultValues: {
      name: option?.name ?? "",
      slug: option?.slug ?? "",
      swatchValue: option?.swatchValue ?? "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const swatchValue = toNullable(values.swatchValue);
      if (!option) {
        return client.catalog.attributes.options.create({
          attributeId: attribute.id,
          name: values.name,
          slug: values.slug,
          swatchValue,
        });
      }
      const changes = {
        name: values.name !== option.name ? values.name : undefined,
        slug: values.slug !== option.slug ? values.slug : undefined,
        swatchValue:
          swatchValue !== option.swatchValue ? swatchValue : undefined,
      };
      if (Object.values(changes).every((value) => value === undefined)) {
        return option;
      }
      return client.catalog.attributes.options.update({
        id: option.id,
        expectedUpdatedAt: option.updatedAt,
        ...changes,
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.catalog.attributes.key(),
      });
      toast.success(option ? "Option saved" : `${saved.name} added`);
      onClose();
    },
    onError: (error) => form.setError("root", { message: errorMessage(error) }),
  });

  const { errors } = form.formState;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <DialogHeader>
            <DialogTitle>
              {option ? `Edit ${option.name}` : `New ${attribute.name} option`}
            </DialogTitle>
            <DialogDescription>
              Options are the values shoppers choose from.
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
            <NameSlugFields
              form={form}
              idPrefix="option"
              namePlaceholder={requiresSwatch ? "Rose gold" : "Size 12"}
            />
            <Field data-invalid={!!errors.swatchValue}>
              <FieldLabel htmlFor="option-swatch">
                Swatch colour{requiresSwatch ? "" : " (optional)"}
              </FieldLabel>
              <Controller
                control={form.control}
                name="swatchValue"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <label className="relative flex size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border shadow-xs focus-within:ring-3 focus-within:ring-ring/50">
                      <span className="sr-only">Pick a colour</span>
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          background: HEX.test(field.value)
                            ? field.value
                            : "repeating-conic-gradient(var(--color-muted) 0% 25%, transparent 0% 50%) 50% / 8px 8px",
                        }}
                      />
                      <input
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => field.onChange(event.target.value)}
                        type="color"
                        value={toSixDigitHex(field.value)}
                      />
                    </label>
                    <Input
                      aria-invalid={!!errors.swatchValue}
                      className="font-mono"
                      id="option-swatch"
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      placeholder="#C9A227"
                      value={field.value}
                    />
                  </div>
                )}
              />
              {errors.swatchValue ? (
                <FieldError errors={[errors.swatchValue]} />
              ) : (
                <FieldDescription>
                  {requiresSwatch
                    ? "Required for colour swatch attributes."
                    : "Leave empty to show text only."}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              disabled={save.isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={save.isPending} type="submit">
              {save.isPending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {option ? "Save changes" : "Add option"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
