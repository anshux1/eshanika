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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@eshanika/ui/components/field";
import { Textarea } from "@eshanika/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import {
  descriptionField,
  nameField,
  slugField,
  toNullable,
} from "./form-schemas";
import { NameSlugFields } from "./name-slug-fields";

export type Tag = RouterOutputs["catalog"]["tags"]["list"]["items"][number];

const schema = z.object({
  name: nameField,
  slug: slugField,
  description: descriptionField,
});

type Values = z.infer<typeof schema>;

export function TagDialog({
  tag,
  onClose,
}: {
  tag: Tag | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tag?.name ?? "",
      slug: tag?.slug ?? "",
      description: tag?.description ?? "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const description = toNullable(values.description);
      if (!tag) {
        return client.catalog.tags.create({ ...values, description });
      }
      const changes = {
        name: values.name !== tag.name ? values.name : undefined,
        slug: values.slug !== tag.slug ? values.slug : undefined,
        description: description !== tag.description ? description : undefined,
      };
      if (Object.values(changes).every((value) => value === undefined)) {
        return tag;
      }
      return client.catalog.tags.update({
        id: tag.id,
        expectedUpdatedAt: tag.updatedAt,
        ...changes,
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.catalog.tags.key(),
      });
      toast.success(tag ? "Tag saved" : `${saved.name} created`);
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
            <DialogTitle>{tag ? `Edit ${tag.name}` : "New tag"}</DialogTitle>
            <DialogDescription>
              Tags group products across categories, like “Bridal” or
              “Bestseller”.
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
              idPrefix="tag"
              namePlaceholder="Bridal"
            />
            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="tag-description">Description</FieldLabel>
              <Textarea
                aria-invalid={!!errors.description}
                id="tag-description"
                placeholder="Optional"
                rows={3}
                {...form.register("description")}
              />
              <FieldError errors={[errors.description]} />
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
              {tag ? "Save changes" : "Create tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
