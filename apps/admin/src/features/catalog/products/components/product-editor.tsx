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
import { Textarea } from "@eshanika/ui/components/textarea";
import { cn } from "@eshanika/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { errorCode, errorMessage } from "@/components/patterns/page-state";
import { SimpleSelect } from "@/components/patterns/simple-select";
import { ProductMediaCard } from "@/features/catalog/media/components/product-media-card";
import { NameSlugFields } from "@/features/catalog/taxonomy/components/name-slug-fields";
import {
  useAllCategories,
  useAllTags,
} from "@/features/catalog/taxonomy/hooks/use-taxonomy-lists";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { client } from "@/orpc/client";
import { orpc } from "@/orpc/query";
import { MultiSelect, type MultiSelectItem } from "./multi-select";
import {
  EMPTY_PRODUCT,
  emptyVariant,
  type ProductDetail,
  type ProductFormValues,
  productFormSchema,
  toFormValues,
  toProductInput,
} from "./product-form-model";
import { StatusCard } from "./status-card";
import { VariantFields } from "./variant-fields";
import { VariationsCard } from "./variations-card";

function useCategoryItems(linked: ProductDetail["categories"]) {
  const categories = useAllCategories("active");
  return useMemo(() => {
    const items = categories.data?.items ?? [];
    const byId = new Map(items.map((item) => [item.id, item]));
    const path = (id: string | null): string[] => {
      const node = id ? byId.get(id) : undefined;
      return node ? [...path(node.parentId), node.name] : [];
    };
    const result: MultiSelectItem[] = items.map((item) => ({
      id: item.id,
      label: item.name,
      hint: path(item.parentId).join(" › ") || undefined,
    }));
    for (const category of linked) {
      if (!byId.has(category.id)) {
        result.push({
          id: category.id,
          label: category.name,
          hint: "Archived",
        });
      }
    }
    return result;
  }, [categories.data, linked]);
}

export function ProductEditor({
  initialProduct,
}: {
  initialProduct: ProductDetail | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [product, setProduct] = useState(initialProduct);
  // Image saves bump the product revision without changing the form.
  const [revision, setRevision] = useState(initialProduct?.updatedAt ?? null);
  const [mediaDirty, setMediaDirty] = useState(false);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialProduct
      ? toFormValues(initialProduct)
      : EMPTY_PRODUCT,
  });
  const { errors, isDirty } = form.formState;
  const productType = form.watch("productType");
  const categoryItems = useCategoryItems(product?.categories ?? []);
  const tags = useAllTags();
  const tagItems: MultiSelectItem[] = (tags.data?.items ?? []).map((tag) => ({
    id: tag.id,
    label: tag.name,
  }));

  useUnsavedChanges(isDirty || mediaDirty);

  const applyProduct = useCallback(
    (next: ProductDetail) => {
      setProduct(next);
      setRevision(next.updatedAt);
      queryClient.setQueryData(
        orpc.catalog.products.get.queryKey({ input: { id: next.id } }),
        next,
      );
      void queryClient.invalidateQueries({
        queryKey: orpc.catalog.products.list.key(),
      });
    },
    [queryClient],
  );

  const reload = useCallback(async () => {
    if (!product) return;
    try {
      const fresh = await client.catalog.products.get({ id: product.id });
      applyProduct(fresh);
      form.reset(toFormValues(fresh));
      void queryClient.invalidateQueries({
        queryKey: orpc.catalog.media.key(),
      });
      toast.success("Loaded the latest version");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [product, applyProduct, form, queryClient]);

  const save = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const input = toProductInput(values);
      if (!product || !revision) return client.catalog.products.create(input);
      return client.catalog.products.update({
        ...input,
        id: product.id,
        expectedUpdatedAt: revision,
      });
    },
    onSuccess: (saved) => {
      if (!product) {
        form.reset(toFormValues(saved));
        toast.success("Product created. Add images next.");
        router.replace(`/products/${saved.id}`);
        return;
      }
      applyProduct(saved);
      form.reset(toFormValues(saved));
      toast.success("Product saved");
    },
    onError: (error) => {
      toast.error(errorMessage(error), {
        action:
          errorCode(error) === "CONFLICT" && product
            ? { label: "Reload", onClick: () => void reload() }
            : undefined,
        duration: 8000,
      });
    },
  });

  function changeType(next: ProductFormValues["productType"]) {
    const current = form.getValues();
    if (next === current.productType) return;
    form.setValue("productType", next, { shouldDirty: true });
    form.setValue(
      "attributes",
      current.attributes.map((attribute) => ({
        ...attribute,
        useForVariants: next === "variable",
      })),
      { shouldDirty: true },
    );
    const first = current.variants[0];
    form.setValue(
      "variants",
      next === "variable"
        ? []
        : [
            first
              ? { ...first, attributeOptions: [], isDefault: true }
              : emptyVariant({ isDefault: true }),
          ],
      { shouldDirty: true },
    );
  }

  const readOnly = product?.status === "archived";
  const onSubmit = form.handleSubmit(
    (values) => save.mutate(values),
    () =>
      toast.error("Some fields need attention. Check the highlighted ones."),
  );

  return (
    <FormProvider {...form}>
      <form className="mx-auto w-full max-w-6xl" noValidate onSubmit={onSubmit}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label="Back to products"
              nativeButton={false}
              render={
                <Link href="/products">
                  <ArrowLeft aria-hidden />
                </Link>
              }
              size="icon"
              variant="outline"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {product ? product.name : "New product"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {product
                  ? `/${product.slug}`
                  : "Fill in the details, then save as a draft."}
              </p>
            </div>
          </div>
        </div>

        {readOnly ? (
          <p className="mb-6 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            This product is archived. Restore it to draft to make changes.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <fieldset className="min-w-0 space-y-6" disabled={readOnly}>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>
                  What shoppers see on the product page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-5">
                  <NameSlugFields
                    form={form}
                    idPrefix="product"
                    namePlaceholder="Kundan choker set"
                  />
                  <Field data-invalid={!!errors.shortDescription}>
                    <FieldLabel htmlFor="product-short">
                      Short description
                    </FieldLabel>
                    <Textarea
                      aria-invalid={!!errors.shortDescription}
                      id="product-short"
                      placeholder="One or two lines shown near the price."
                      rows={2}
                      {...form.register("shortDescription")}
                    />
                    <FieldError errors={[errors.shortDescription]} />
                  </Field>
                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="product-description">
                      Description
                    </FieldLabel>
                    <Textarea
                      aria-invalid={!!errors.description}
                      className="min-h-40"
                      id="product-description"
                      placeholder="Materials, craft, sizing, and care."
                      {...form.register("description")}
                    />
                    <FieldError errors={[errors.description]} />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {product && revision ? (
              <ProductMediaCard
                onConflict={() => void reload()}
                onDirtyChange={setMediaDirty}
                onSaved={setRevision}
                productId={product.id}
                revision={revision}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
                    <ImagePlus aria-hidden className="mb-2 size-6" />
                    Save the product first, then add images.
                  </div>
                </CardContent>
              </Card>
            )}

            {productType === "simple" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing and stock</CardTitle>
                  <CardDescription>
                    Prices are in rupees and include tax as set below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup className="gap-7">
                    <Field data-invalid={!!errors.variants?.[0]?.sku}>
                      <FieldLabel htmlFor="variant-0-sku">SKU</FieldLabel>
                      <Input
                        aria-invalid={!!errors.variants?.[0]?.sku}
                        className="font-mono sm:max-w-xs"
                        id="variant-0-sku"
                        placeholder="ESH-CHK-001"
                        {...form.register("variants.0.sku")}
                      />
                      <FieldError errors={[errors.variants?.[0]?.sku]} />
                    </Field>
                    <VariantFields index={0} />
                  </FieldGroup>
                </CardContent>
              </Card>
            ) : null}

            <VariationsCard linkedAttributes={product?.attributes ?? []} />
          </fieldset>

          <div className="min-w-0 space-y-6">
            <StatusCard
              formDirty={isDirty || mediaDirty}
              onChanged={(next) => {
                applyProduct(next);
                form.reset(toFormValues(next));
              }}
              onConflict={() => void reload()}
              product={product}
              revision={revision}
            />
            <fieldset className="space-y-6" disabled={readOnly}>
              <Card>
                <CardHeader>
                  <CardTitle>Organisation</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldLabel htmlFor="product-type">
                        Product type
                      </FieldLabel>
                      <SimpleSelect
                        id="product-type"
                        onChange={changeType}
                        options={[
                          { value: "simple", label: "Simple product" },
                          { value: "variable", label: "With variations" },
                        ]}
                        value={productType}
                      />
                      <FieldDescription>
                        {productType === "simple"
                          ? "One price and SKU."
                          : "A price and SKU for each option combination."}
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="product-categories">
                        Categories
                      </FieldLabel>
                      <Controller
                        control={form.control}
                        name="categoryIds"
                        render={({ field }) => (
                          <MultiSelect
                            emptyText="No categories found."
                            id="product-categories"
                            items={categoryItems}
                            onChange={field.onChange}
                            placeholder="Choose categories"
                            value={field.value}
                          />
                        )}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="product-tags">Tags</FieldLabel>
                      <Controller
                        control={form.control}
                        name="tagIds"
                        render={({ field }) => (
                          <MultiSelect
                            emptyText="No tags found."
                            id="product-tags"
                            items={tagItems}
                            onChange={field.onChange}
                            placeholder="Choose tags"
                            value={field.value}
                          />
                        )}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tax</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup className="gap-5">
                    <Field>
                      <FieldLabel htmlFor="product-tax-status">
                        Tax status
                      </FieldLabel>
                      <Controller
                        control={form.control}
                        name="taxStatus"
                        render={({ field }) => (
                          <SimpleSelect
                            id="product-tax-status"
                            onChange={field.onChange}
                            options={[
                              { value: "taxable", label: "Taxable" },
                              { value: "shipping", label: "Shipping only" },
                              { value: "none", label: "Not taxed" },
                            ]}
                            value={field.value}
                          />
                        )}
                      />
                    </Field>
                    <Field data-invalid={!!errors.taxClass}>
                      <FieldLabel htmlFor="product-tax-class">
                        Tax class
                      </FieldLabel>
                      <Input
                        id="product-tax-class"
                        placeholder="Standard"
                        {...form.register("taxClass")}
                      />
                      <FieldError errors={[errors.taxClass]} />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </fieldset>
          </div>
        </div>

        <div
          className={cn(
            "sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-3 rounded-xl border bg-background/90 px-4 py-3 shadow-lg backdrop-blur-md transition-all",
            !isDirty &&
              product &&
              "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <p className="text-sm text-muted-foreground">
            {product
              ? "You have unsaved changes."
              : "New product, not saved yet."}
          </p>
          <div className="flex gap-2">
            {product ? (
              <Button
                disabled={save.isPending}
                onClick={() => form.reset()}
                type="button"
                variant="ghost"
              >
                Discard
              </Button>
            ) : null}
            <Button disabled={save.isPending || readOnly} type="submit">
              {save.isPending ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : null}
              {product ? "Save changes" : "Create product"}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
