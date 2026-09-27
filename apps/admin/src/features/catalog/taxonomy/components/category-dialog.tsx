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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eshanika/ui/components/select";
import { Textarea } from "@eshanika/ui/components/textarea";
import { cn } from "@eshanika/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";
import {
  type CategoryNode,
  descendantIds,
  flattenTree,
  MAX_CATEGORY_DEPTH,
  subtreeHeight,
} from "./category-tree";
import {
  descriptionField,
  nameField,
  slugField,
  toNullable,
} from "./form-schemas";
import { NameSlugFields } from "./name-slug-fields";

const ROOT = "root";

const schema = z.object({
  name: nameField,
  slug: slugField,
  description: descriptionField,
  parentId: z.string(),
});

type Values = z.infer<typeof schema>;

export type CategoryDialogState =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; category: CategoryNode };

export function CategoryDialog({
  state,
  tree,
  onClose,
}: {
  state: CategoryDialogState;
  tree: CategoryNode[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const editing = state.mode === "edit" ? state.category : null;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          name: editing.name,
          slug: editing.slug,
          description: editing.description ?? "",
          parentId: editing.parentId ?? ROOT,
        }
      : {
          name: "",
          slug: "",
          description: "",
          parentId: state.mode === "create" ? (state.parentId ?? ROOT) : ROOT,
        },
  });

  const blocked = editing ? descendantIds(editing) : new Set<string>();
  if (editing) blocked.add(editing.id);
  const height = editing ? subtreeHeight(editing) : 1;
  const parents = flattenTree(tree).map((node) => ({
    node,
    disabled: blocked.has(node.id) || node.depth + height > MAX_CATEGORY_DEPTH,
  }));
  const items = [
    { value: ROOT, label: "No parent (top level)" },
    ...parents.map(({ node }) => ({ value: node.id, label: node.name })),
  ];

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const parentId = values.parentId === ROOT ? null : values.parentId;
      const description = toNullable(values.description);
      if (!editing) {
        return client.catalog.categories.create({
          parentId,
          name: values.name,
          slug: values.slug,
          description,
        });
      }
      let current = editing;
      const changes = {
        name: values.name !== editing.name ? values.name : undefined,
        slug: values.slug !== editing.slug ? values.slug : undefined,
        description:
          description !== editing.description ? description : undefined,
      };
      let expectedUpdatedAt = current.updatedAt;
      if (Object.values(changes).some((value) => value !== undefined)) {
        const updated = await client.catalog.categories.update({
          id: current.id,
          expectedUpdatedAt,
          ...changes,
        });
        expectedUpdatedAt = updated.updatedAt;
        current = { ...current, ...updated };
      }
      if (parentId !== editing.parentId) {
        return client.catalog.categories.reparent({
          id: current.id,
          parentId,
          expectedUpdatedAt,
        });
      }
      return current;
    },
    onSuccess: (category) => {
      toast.success(editing ? "Category saved" : `${category.name} created`);
      onClose();
    },
    onError: (error) => form.setError("root", { message: errorMessage(error) }),
    // Partial saves still changed data, so refresh either way.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: orpc.catalog.categories.key(),
      }),
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
              {editing ? `Edit ${editing.name}` : "New category"}
            </DialogTitle>
            <DialogDescription>
              Categories can nest up to {MAX_CATEGORY_DEPTH} levels deep.
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
              idPrefix="category"
              namePlaceholder="Necklaces"
            />
            <Field>
              <FieldLabel htmlFor="category-parent">Parent</FieldLabel>
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <Select
                    items={items}
                    onValueChange={(value) => field.onChange(value ?? ROOT)}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full" id="category-parent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT}>
                        No parent (top level)
                      </SelectItem>
                      {parents.map(({ node, disabled }) => (
                        <SelectItem
                          disabled={disabled}
                          key={node.id}
                          value={node.id}
                        >
                          <span
                            className={cn(
                              node.depth === 2 && "pl-4",
                              node.depth >= 3 && "pl-8",
                            )}
                          >
                            {node.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>
                A category can't move under itself or its own subcategories.
              </FieldDescription>
            </Field>
            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="category-description">
                Description
              </FieldLabel>
              <Textarea
                aria-invalid={!!errors.description}
                id="category-description"
                placeholder="Optional. Shown on the category page."
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
              {editing ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
