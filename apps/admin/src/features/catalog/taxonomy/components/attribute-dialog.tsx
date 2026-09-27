"use client";

import { AttributeDisplayType } from "@eshanika/database/enums";
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@eshanika/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@eshanika/ui/components/radio-group";
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
import { nameField, slugField } from "./form-schemas";
import { NameSlugFields } from "./name-slug-fields";

export type Attribute =
  RouterOutputs["catalog"]["attributes"]["list"]["items"][number];

const schema = z.object({
  name: nameField,
  slug: slugField,
  displayType: z.enum(AttributeDisplayType),
});

type Values = z.infer<typeof schema>;

const DISPLAY_TYPES = [
  {
    value: "select",
    title: "Dropdown",
    description: "Shoppers pick from a list, like ring sizes.",
  },
  {
    value: "swatch",
    title: "Colour swatch",
    description: "Shoppers pick a colour dot. Every option needs a colour.",
  },
] as const;

export function AttributeDialog({
  attribute,
  onClose,
}: {
  attribute: Attribute | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: attribute?.name ?? "",
      slug: attribute?.slug ?? "",
      displayType: attribute?.displayType ?? "select",
    },
  });

  const save = useMutation({
    mutationFn: async (values: Values) => {
      if (!attribute) return client.catalog.attributes.create(values);
      const changes = {
        name: values.name !== attribute.name ? values.name : undefined,
        slug: values.slug !== attribute.slug ? values.slug : undefined,
        displayType:
          values.displayType !== attribute.displayType
            ? values.displayType
            : undefined,
      };
      if (Object.values(changes).every((value) => value === undefined)) {
        return attribute;
      }
      return client.catalog.attributes.update({
        id: attribute.id,
        expectedUpdatedAt: attribute.updatedAt,
        ...changes,
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.catalog.attributes.key(),
      });
      toast.success(attribute ? "Attribute saved" : `${saved.name} created`);
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
      <DialogContent className="sm:max-w-lg">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <DialogHeader>
            <DialogTitle>
              {attribute ? `Edit ${attribute.name}` : "New attribute"}
            </DialogTitle>
            <DialogDescription>
              Attributes describe product choices, such as metal or size.
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
              idPrefix="attribute"
              namePlaceholder="Metal"
            />
            <Field>
              <FieldLabel>Display</FieldLabel>
              <Controller
                control={form.control}
                name="displayType"
                render={({ field }) => (
                  <RadioGroup
                    aria-label="Display"
                    className="sm:grid-cols-2"
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    {DISPLAY_TYPES.map((type) => (
                      <FieldLabel
                        htmlFor={`display-${type.value}`}
                        key={type.value}
                      >
                        <Field orientation="horizontal">
                          <FieldContent>
                            <FieldTitle>{type.title}</FieldTitle>
                            <FieldDescription>
                              {type.description}
                            </FieldDescription>
                          </FieldContent>
                          <RadioGroupItem
                            id={`display-${type.value}`}
                            value={type.value}
                          />
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                )}
              />
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
              {attribute ? "Save changes" : "Create attribute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
