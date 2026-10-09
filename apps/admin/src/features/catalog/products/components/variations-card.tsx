"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@eshanika/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@eshanika/ui/components/dropdown-menu";
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
import { Switch } from "@eshanika/ui/components/switch";
import { cn } from "@eshanika/ui/lib/utils";
import { useQueries } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { MultiSelect } from "@/components/patterns/multi-select";
import { errorMessage } from "@/components/patterns/page-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import {
  allOptionsQueryOptions,
  useAllAttributes,
} from "@/features/catalog/taxonomy/hooks/use-taxonomy-lists";
import { client } from "@/orpc/client";
import {
  combinationKey,
  emptyVariant,
  type ProductDetail,
  type ProductFormValues,
} from "./product-form-model";
import { VariantFields } from "./variant-fields";

type OptionInfo = { id: string; name: string; slug: string; archived: boolean };
type AttributeInfo = {
  id: string;
  name: string;
  archived: boolean;
  options: OptionInfo[];
};

// Active taxonomy plus anything already on the product, which may be archived.
function useAttributeCatalog(
  attributeIds: string[],
  linked: ProductDetail["attributes"],
) {
  const attributes = useAllAttributes("active");
  const optionQueries = useQueries({
    queries: attributeIds.map((id) => allOptionsQueryOptions(id)),
  });

  return useMemo(() => {
    const catalog = new Map<string, AttributeInfo>();
    for (const attribute of attributes.data?.items ?? []) {
      catalog.set(attribute.id, {
        id: attribute.id,
        name: attribute.name,
        archived: false,
        options: [],
      });
    }
    for (const attribute of linked) {
      if (!catalog.has(attribute.id)) {
        catalog.set(attribute.id, {
          id: attribute.id,
          name: attribute.name,
          archived: true,
          options: [],
        });
      }
    }
    attributeIds.forEach((id, index) => {
      const info = catalog.get(id);
      if (!info) return;
      const active = optionQueries[index]?.data?.items ?? [];
      const options = new Map<string, OptionInfo>(
        active.map((option) => [
          option.id,
          {
            id: option.id,
            name: option.name,
            slug: option.slug,
            archived: false,
          },
        ]),
      );
      for (const option of linked.find((item) => item.id === id)?.options ??
        []) {
        if (!options.has(option.id)) {
          options.set(option.id, { ...option, archived: true });
        }
      }
      info.options = [...options.values()];
    });
    return { catalog, loading: attributes.isPending };
  }, [
    attributes.data,
    attributes.isPending,
    linked,
    attributeIds,
    optionQueries,
  ]);
}

function optionLabel(
  catalog: Map<string, AttributeInfo>,
  options: ProductFormValues["variants"][number]["attributeOptions"],
) {
  return options
    .map(
      (option) =>
        catalog
          .get(option.attributeId)
          ?.options.find((item) => item.id === option.attributeOptionId)
          ?.name ?? "…",
    )
    .join(" / ");
}

function expectedCombinationCount(attributes: ProductFormValues["attributes"]) {
  return attributes
    .filter((attribute) => attribute.useForVariants)
    .reduce((count, attribute) => count * attribute.optionIds.length, 1);
}

export function VariationsCard({
  linkedAttributes,
}: {
  linkedAttributes: ProductDetail["attributes"];
}) {
  const form = useFormContext<ProductFormValues>();
  const attributesArray = useFieldArray({
    control: form.control,
    name: "attributes",
  });
  const variantsArray = useFieldArray({
    control: form.control,
    name: "variants",
    keyName: "key",
  });
  const productType = form.watch("productType");
  const attributes = form.watch("attributes");
  const variants = form.watch("variants");
  const slug = form.watch("slug");
  const isVariable = productType === "variable";
  const attributeIds = useMemo(
    () => attributes.map((attribute) => attribute.attributeId),
    [attributes],
  );
  const { catalog } = useAttributeCatalog(attributeIds, linkedAttributes);
  const [generating, setGenerating] = useState(false);
  const [editingVariant, setEditingVariant] = useState<number | null>(null);

  const unused = [...catalog.values()].filter(
    (attribute) => !attribute.archived && !attributeIds.includes(attribute.id),
  );
  const variationAttributes = attributes.filter(
    (attribute) => attribute.useForVariants && attribute.optionIds.length > 0,
  );
  const outOfDate =
    isVariable &&
    variationAttributes.length > 0 &&
    (variants.length !== expectedCombinationCount(attributes) ||
      variants.some(
        (variant) =>
          variant.attributeOptions.length !== variationAttributes.length ||
          variant.attributeOptions.some(
            (option) =>
              !variationAttributes
                .find((item) => item.attributeId === option.attributeId)
                ?.optionIds.includes(option.attributeOptionId),
          ),
      ));

  async function generate() {
    setGenerating(true);
    try {
      const combinations =
        await client.catalog.products.generateVariantCombinations({
          attributes: variationAttributes.map(({ attributeId, optionIds }) => ({
            attributeId,
            optionIds,
          })),
        });
      const current = form.getValues("variants");
      const existing = new Map(
        current.map((variant) => [
          combinationKey(variant.attributeOptions),
          variant,
        ]),
      );
      const firstPrice = current.find(
        (variant) => variant.regularPrice,
      )?.regularPrice;
      const next = combinations.map((combination) => {
        const kept = existing.get(combinationKey(combination));
        if (kept) return kept;
        const slugs = combination.map(
          (option) =>
            catalog
              .get(option.attributeId)
              ?.options.find((item) => item.id === option.attributeOptionId)
              ?.slug ?? "option",
        );
        return emptyVariant({
          attributeOptions: combination,
          name: optionLabel(catalog, combination),
          sku: [slug || "sku", ...slugs].join("-").toUpperCase(),
          regularPrice: firstPrice ?? "",
        });
      });
      if (!next.some((variant) => variant.isDefault) && next[0]) {
        next[0] = { ...next[0], isDefault: true };
      }
      const removed = current.filter(
        (variant) =>
          !next.includes(variant) && variant.attributeOptions.length > 0,
      ).length;
      variantsArray.replace(next);
      toast.success(
        `${next.length} variation${next.length === 1 ? "" : "s"} ready${
          removed ? `. ${removed} will be removed when you save.` : ""
        }`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setGenerating(false);
    }
  }

  function makeDefault(index: number) {
    form.getValues("variants").forEach((_, position) => {
      form.setValue(`variants.${position}.isDefault`, position === index, {
        shouldDirty: true,
      });
    });
  }

  const variantsError =
    form.formState.errors.variants?.root?.message ??
    form.formState.errors.variants?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isVariable ? "Attributes and variations" : "Attributes"}
        </CardTitle>
        <CardDescription>
          {isVariable
            ? "Pick the attributes shoppers choose between, then generate a variant for each combination."
            : "Describe the product with attributes like metal or stone."}
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  disabled={unused.length === 0}
                  size="sm"
                  variant="outline"
                />
              }
            >
              <Plus aria-hidden />
              Add attribute
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {unused.map((attribute) => (
                <DropdownMenuItem
                  key={attribute.id}
                  onClick={() =>
                    attributesArray.append({
                      attributeId: attribute.id,
                      useForVariants: isVariable,
                      optionIds: [],
                    })
                  }
                >
                  {attribute.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        {attributesArray.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No attributes yet.
            {isVariable ? " Add one to create variations." : ""}
          </p>
        ) : (
          <ul className="space-y-3">
            {attributesArray.fields.map((field, index) => {
              const info = catalog.get(field.attributeId);
              const optionsError =
                form.formState.errors.attributes?.[index]?.optionIds?.message;
              return (
                <li
                  className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
                  key={field.id}
                >
                  <div className="flex items-center gap-2 pt-1.5">
                    <span className="font-medium">{info?.name ?? "…"}</span>
                    {info?.archived ? (
                      <StatusBadge tone="muted">Archived</StatusBadge>
                    ) : null}
                  </div>
                  <Field data-invalid={!!optionsError}>
                    <FieldLabel
                      className="sr-only"
                      htmlFor={`attribute-${index}`}
                    >
                      {info?.name} options
                    </FieldLabel>
                    <Controller
                      control={form.control}
                      name={`attributes.${index}.optionIds`}
                      render={({ field: optionField }) => (
                        <MultiSelect
                          emptyText="No options. Add them on the Attributes page."
                          id={`attribute-${index}`}
                          invalid={!!optionsError}
                          items={(info?.options ?? [])
                            .filter(
                              (option) =>
                                !option.archived ||
                                optionField.value.includes(option.id),
                            )
                            .map((option) => ({
                              id: option.id,
                              label: option.name,
                              hint: option.archived ? "Archived" : undefined,
                            }))}
                          onChange={optionField.onChange}
                          placeholder="Choose options"
                          value={optionField.value}
                        />
                      )}
                    />
                    <FieldError
                      errors={optionsError ? [{ message: optionsError }] : []}
                    />
                    {isVariable ? (
                      <Controller
                        control={form.control}
                        name={`attributes.${index}.useForVariants`}
                        render={({ field: toggle }) => (
                          <Field orientation="horizontal">
                            <Switch
                              checked={toggle.value}
                              id={`attribute-${index}-variations`}
                              onCheckedChange={toggle.onChange}
                              size="sm"
                            />
                            <FieldLabel
                              className="font-normal text-muted-foreground"
                              htmlFor={`attribute-${index}-variations`}
                            >
                              Use for variations
                            </FieldLabel>
                          </Field>
                        )}
                      />
                    ) : null}
                  </Field>
                  <Button
                    aria-label={`Remove ${info?.name ?? "attribute"}`}
                    className="justify-self-end text-muted-foreground hover:text-destructive"
                    onClick={() => attributesArray.remove(index)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {isVariable ? (
          <div className="space-y-4 border-t pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium">Variations</h3>
                <p className="text-sm text-muted-foreground">
                  {variants.length} of {expectedCombinationCount(attributes)}{" "}
                  combinations
                </p>
              </div>
              <Button
                disabled={generating || variationAttributes.length === 0}
                onClick={() => void generate()}
                type="button"
                variant={
                  outOfDate || variants.length === 0 ? "default" : "outline"
                }
              >
                {generating ? (
                  <Loader2 aria-hidden className="animate-spin" />
                ) : (
                  <Sparkles aria-hidden />
                )}
                Generate variations
              </Button>
            </div>
            {outOfDate ? (
              <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                <TriangleAlert aria-hidden className="size-4 shrink-0" />
                The chosen options changed. Generate variations again before
                saving.
              </p>
            ) : null}
            {variantsError ? (
              <p className="text-sm text-destructive" role="alert">
                {variantsError}
              </p>
            ) : null}
            {variantsArray.fields.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Variant</th>
                      <th className="px-2 py-2 font-medium">SKU</th>
                      <th className="px-2 py-2 font-medium">Price</th>
                      <th className="px-2 py-2 font-medium">Sale</th>
                      <th className="px-2 py-2 text-center font-medium">
                        Default
                      </th>
                      <th className="px-3 py-2">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {variantsArray.fields.map((field, index) => {
                      const errors =
                        form.formState.errors.variants?.[index] ?? {};
                      const variant = variants[index];
                      const hiddenErrors = [
                        "saleEndsAt",
                        "weight",
                        "length",
                        "width",
                        "height",
                      ].some((key) => key in errors);
                      return (
                        <tr className="align-top" key={field.key}>
                          <td className="px-3 py-2.5">
                            <p className="font-medium whitespace-nowrap">
                              {optionLabel(
                                catalog,
                                variant?.attributeOptions ?? [],
                              ) || variant?.name}
                            </p>
                            {variant?.stockStatus === "out_of_stock" ? (
                              <span className="text-xs text-muted-foreground">
                                Out of stock
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              aria-invalid={!!errors.sku}
                              aria-label="SKU"
                              className="h-8 min-w-44 font-mono text-xs"
                              {...form.register(`variants.${index}.sku`)}
                            />
                            {errors.sku ? (
                              <p className="mt-1 text-xs text-destructive">
                                {errors.sku.message}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            <InputGroup className="h-8 min-w-28">
                              <InputGroupAddon>
                                <InputGroupText>₹</InputGroupText>
                              </InputGroupAddon>
                              <InputGroupInput
                                aria-invalid={!!errors.regularPrice}
                                aria-label="Regular price"
                                inputMode="decimal"
                                {...form.register(
                                  `variants.${index}.regularPrice`,
                                )}
                              />
                            </InputGroup>
                            {errors.regularPrice ? (
                              <p className="mt-1 text-xs text-destructive">
                                {errors.regularPrice.message}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            <InputGroup className="h-8 min-w-28">
                              <InputGroupAddon>
                                <InputGroupText>₹</InputGroupText>
                              </InputGroupAddon>
                              <InputGroupInput
                                aria-invalid={!!errors.salePrice}
                                aria-label="Sale price"
                                inputMode="decimal"
                                {...form.register(
                                  `variants.${index}.salePrice`,
                                )}
                              />
                            </InputGroup>
                            {errors.salePrice ? (
                              <p className="mt-1 text-xs text-destructive">
                                {errors.salePrice.message}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              aria-label={
                                variant?.isDefault
                                  ? "Default variant"
                                  : "Make default"
                              }
                              aria-pressed={variant?.isDefault}
                              className={cn(
                                variant?.isDefault
                                  ? "text-amber-500"
                                  : "text-muted-foreground",
                              )}
                              onClick={() => makeDefault(index)}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <Star
                                aria-hidden
                                className={cn(
                                  variant?.isDefault && "fill-current",
                                )}
                              />
                            </Button>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              <Button
                                aria-label="More variant settings"
                                className={cn(
                                  hiddenErrors && "text-destructive",
                                )}
                                onClick={() => setEditingVariant(index)}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <Settings2 aria-hidden />
                              </Button>
                              <Button
                                aria-label="Remove variant"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => variantsArray.remove(index)}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 aria-hidden />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditingVariant(null);
        }}
        open={editingVariant !== null}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVariant !== null
                ? optionLabel(
                    catalog,
                    variants[editingVariant]?.attributeOptions ?? [],
                  ) || "Variant"
                : "Variant"}
            </DialogTitle>
            <DialogDescription>
              Changes apply when you save the product.
            </DialogDescription>
          </DialogHeader>
          {editingVariant !== null ? (
            <FieldGroup className="gap-7">
              <Field>
                <FieldLabel htmlFor={`variant-${editingVariant}-name`}>
                  Variant name
                </FieldLabel>
                <Input
                  id={`variant-${editingVariant}-name`}
                  {...form.register(`variants.${editingVariant}.name`)}
                />
              </Field>
              <VariantFields index={editingVariant} />
            </FieldGroup>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setEditingVariant(null)} type="button">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
