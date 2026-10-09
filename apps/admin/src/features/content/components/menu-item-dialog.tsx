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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { useAllCategories } from "@/features/catalog/taxonomy/hooks/use-taxonomy-lists";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";
import type { RouterOutputs } from "@/orpc/types";
import { type MENU_LOCATIONS, menuUrl } from "../schema";

export type MenuItem =
  RouterOutputs["content"]["menus"]["get"]["items"][number];
type Location = (typeof MENU_LOCATIONS)[number];

const itemFormSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Enter the link text")
      .max(80, "Keep the link text under 80 characters"),
    type: z.enum(["page", "category", "url"]),
    contentEntryId: z.string(),
    categoryId: z.string(),
    url: z.string(),
  })
  .superRefine((values, context) => {
    if (values.type === "page" && !values.contentEntryId)
      context.addIssue({
        code: "custom",
        path: ["contentEntryId"],
        message: "Choose a page",
      });
    if (values.type === "category" && !values.categoryId)
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Choose a category",
      });
    if (values.type === "url") {
      const parsed = menuUrl.safeParse(values.url);
      if (!parsed.success)
        context.addIssue({
          code: "custom",
          path: ["url"],
          message: parsed.error.issues[0]?.message ?? "Enter a link",
        });
    }
  });

type ItemFormValues = z.input<typeof itemFormSchema>;

function toTarget(values: z.output<typeof itemFormSchema>) {
  if (values.type === "page")
    return { type: "page" as const, contentEntryId: values.contentEntryId };
  if (values.type === "category")
    return { type: "category" as const, categoryId: values.categoryId };
  return { type: "url" as const, url: values.url.trim() };
}

function useLinkablePages() {
  const input = { limit: 100 };
  return useQuery({
    ...orpc.content.pages.list.queryOptions({ input }),
    queryFn: () =>
      fetchAllPages((cursor) =>
        client.content.pages.list({ ...input, cursor }),
      ),
    select: (page) => page.items.filter((entry) => entry.status !== "archived"),
  });
}

export function MenuItemDialog({
  location,
  item,
  onClose,
}: {
  location: Location;
  item: MenuItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const pages = useLinkablePages();
  const categories = useAllCategories();
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      label: item?.label ?? "",
      type: item?.category ? "category" : item?.url ? "url" : "page",
      contentEntryId: item?.contentEntry?.id ?? "",
      categoryId: item?.category?.id ?? "",
      url: item?.url ?? "",
    },
  });
  const { errors } = form.formState;
  const type = form.watch("type");
  const options = {
    onError: (error: unknown) =>
      form.setError("root", { message: errorMessage(error) }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: orpc.content.key() }),
  };
  const add = useMutation(
    orpc.content.menus.addItem.mutationOptions({
      ...options,
      onSuccess: (saved) => {
        toast.success(`${saved.label} added to the menu`);
        onClose();
      },
    }),
  );
  const update = useMutation(
    orpc.content.menus.updateItem.mutationOptions({
      ...options,
      onSuccess: () => {
        toast.success("Menu link saved");
        onClose();
      },
    }),
  );
  const pending = add.isPending || update.isPending;

  // Picking a page or category fills an empty label with its name.
  function suggestLabel(name: string | undefined) {
    if (name && !form.getValues("label").trim()) form.setValue("label", name);
  }

  return (
    <Dialog onOpenChange={(open) => !open && !pending && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <form
          className="grid gap-6"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            const parsed = itemFormSchema.parse(values);
            const target = toTarget(parsed);
            if (!item)
              return add.mutate({ location, label: parsed.label, target });
            update.mutate({
              id: item.id,
              expectedUpdatedAt: new Date(item.updatedAt).toISOString(),
              label: parsed.label,
              target,
            });
          })}
        >
          <DialogHeader>
            <DialogTitle>
              {item ? `Edit ${item.label}` : "Add menu link"}
            </DialogTitle>
            <DialogDescription>
              Each link goes to one page, one category, or one address.
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
            <Field>
              <FieldLabel htmlFor="menu-type">Links to</FieldLabel>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <SimpleSelect
                    id="menu-type"
                    onChange={field.onChange}
                    options={[
                      { value: "page", label: "A page" },
                      { value: "category", label: "A category" },
                      { value: "url", label: "An address" },
                    ]}
                    value={field.value}
                  />
                )}
              />
            </Field>
            {type === "page" ? (
              <Field data-invalid={!!errors.contentEntryId}>
                <FieldLabel htmlFor="menu-page">Page</FieldLabel>
                <Controller
                  control={form.control}
                  name="contentEntryId"
                  render={({ field }) => (
                    <SimpleSelect
                      disabled={!pages.data}
                      id="menu-page"
                      onChange={(next) => {
                        field.onChange(next);
                        suggestLabel(
                          pages.data?.find((page) => page.id === next)?.title,
                        );
                      }}
                      options={[
                        {
                          value: "",
                          label: pages.data
                            ? "Choose a page"
                            : "Loading pages…",
                        },
                        ...(pages.data ?? []).map((page) => ({
                          value: page.id,
                          label:
                            page.status === "published"
                              ? page.title
                              : `${page.title} (not live)`,
                        })),
                      ]}
                      value={field.value}
                    />
                  )}
                />
                <FieldError errors={[errors.contentEntryId]} />
              </Field>
            ) : null}
            {type === "category" ? (
              <Field data-invalid={!!errors.categoryId}>
                <FieldLabel htmlFor="menu-category">Category</FieldLabel>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <SimpleSelect
                      disabled={!categories.data}
                      id="menu-category"
                      onChange={(next) => {
                        field.onChange(next);
                        suggestLabel(
                          categories.data?.items.find(
                            (category) => category.id === next,
                          )?.name,
                        );
                      }}
                      options={[
                        {
                          value: "",
                          label: categories.data
                            ? "Choose a category"
                            : "Loading categories…",
                        },
                        ...(categories.data?.items ?? []).map((category) => ({
                          value: category.id,
                          label: category.name,
                        })),
                      ]}
                      value={field.value}
                    />
                  )}
                />
                <FieldError errors={[errors.categoryId]} />
              </Field>
            ) : null}
            {type === "url" ? (
              <Field data-invalid={!!errors.url}>
                <FieldLabel htmlFor="menu-url">Address</FieldLabel>
                <Input
                  aria-invalid={!!errors.url}
                  id="menu-url"
                  inputMode="url"
                  placeholder="/new-arrivals or https://"
                  {...form.register("url")}
                />
                <FieldDescription>
                  A path on the store or a full https:// link.
                </FieldDescription>
                <FieldError errors={[errors.url]} />
              </Field>
            ) : null}
            <Field data-invalid={!!errors.label}>
              <FieldLabel htmlFor="menu-label">Link text</FieldLabel>
              <Input
                aria-invalid={!!errors.label}
                id="menu-label"
                placeholder="About us"
                {...form.register("label")}
              />
              <FieldError errors={[errors.label]} />
            </Field>
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
              {item ? "Save link" : "Add link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
