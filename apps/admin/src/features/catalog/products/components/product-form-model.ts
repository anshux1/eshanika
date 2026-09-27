import {
  BackorderPolicy,
  ProductTaxStatus,
  ProductType,
  VariantStockStatus,
} from "@eshanika/database/enums";
import { z } from "zod";
import { fromIstInputValue, toIstInputValue } from "@/lib/format";
import { rupeesToPaise } from "@/lib/money";
import type { RouterInputs, RouterOutputs } from "@/orpc/types";

export type ProductDetail = RouterOutputs["catalog"]["products"]["get"];
type CreateInput = RouterInputs["catalog"]["products"]["create"];

const MONEY = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const MEASUREMENT = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalMeasurement = z
  .string()
  .trim()
  .refine((value) => !value || MEASUREMENT.test(value), {
    message: "Up to three decimal places",
  });

export const variantFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().max(250),
    sku: z.string().trim().min(1, "Enter a SKU").max(100),
    regularPrice: z
      .string()
      .trim()
      .regex(MONEY, "Enter a price, like 2499 or 2499.50"),
    salePrice: z
      .string()
      .trim()
      .refine((value) => !value || MONEY.test(value), {
        message: "Enter a price, like 1999",
      }),
    saleStartsAt: z.string(),
    saleEndsAt: z.string(),
    stockStatus: z.enum(VariantStockStatus),
    manageStock: z.boolean(),
    backorderPolicy: z.enum(BackorderPolicy),
    weight: optionalMeasurement,
    length: optionalMeasurement,
    width: optionalMeasurement,
    height: optionalMeasurement,
    isDefault: z.boolean(),
    attributeOptions: z.array(
      z.object({ attributeId: z.string(), attributeOptionId: z.string() }),
    ),
  })
  .superRefine((variant, context) => {
    if (
      variant.salePrice &&
      MONEY.test(variant.salePrice) &&
      MONEY.test(variant.regularPrice) &&
      rupeesToPaise(variant.salePrice) >= rupeesToPaise(variant.regularPrice)
    ) {
      context.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "Must be lower than the regular price",
      });
    }
    if (
      variant.saleStartsAt &&
      variant.saleEndsAt &&
      variant.saleEndsAt <= variant.saleStartsAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["saleEndsAt"],
        message: "Must be after the start",
      });
    }
  });

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a product name").max(250),
    slug: z
      .string()
      .trim()
      .min(1, "Enter a slug")
      .max(180)
      .regex(SLUG, "Use lowercase letters, numbers, and single hyphens"),
    shortDescription: z.string().max(1000, "Keep it under 1000 characters"),
    description: z.string().max(50_000),
    productType: z.enum(ProductType),
    taxStatus: z.enum(ProductTaxStatus),
    taxClass: z.string().trim().max(100),
    categoryIds: z.array(z.string()),
    tagIds: z.array(z.string()),
    attributes: z.array(
      z.object({
        attributeId: z.string(),
        useForVariants: z.boolean(),
        optionIds: z.array(z.string()),
      }),
    ),
    variants: z.array(variantFormSchema),
  })
  .superRefine((product, context) => {
    product.attributes.forEach((attribute, index) => {
      if (attribute.optionIds.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["attributes", index, "optionIds"],
          message: "Choose at least one option",
        });
      }
    });
    if (product.variants.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Generate variations before saving",
      });
    }
    const skus = product.variants.map((variant) => variant.sku.trim());
    skus.forEach((sku, index) => {
      if (sku && skus.indexOf(sku) !== index) {
        context.addIssue({
          code: "custom",
          path: ["variants", index, "sku"],
          message: "Each variant needs its own SKU",
        });
      }
    });
    if (product.variants.filter((variant) => variant.isDefault).length > 1) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Only one variant can be the default",
      });
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type VariantFormValues = z.infer<typeof variantFormSchema>;

export function emptyVariant(
  overrides: Partial<VariantFormValues> = {},
): VariantFormValues {
  return {
    name: "",
    sku: "",
    regularPrice: "",
    salePrice: "",
    saleStartsAt: "",
    saleEndsAt: "",
    stockStatus: "in_stock",
    manageStock: false,
    backorderPolicy: "no",
    weight: "",
    length: "",
    width: "",
    height: "",
    isDefault: false,
    attributeOptions: [],
    ...overrides,
  };
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  productType: "simple",
  taxStatus: "taxable",
  taxClass: "",
  categoryIds: [],
  tagIds: [],
  attributes: [],
  variants: [emptyVariant({ isDefault: true })],
};

export function toFormValues(product: ProductDetail): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    productType: product.productType,
    taxStatus: product.taxStatus,
    taxClass: product.taxClass ?? "",
    categoryIds: product.categories.map((category) => category.id),
    tagIds: product.tags.map((tag) => tag.id),
    attributes: product.attributes.map((attribute) => ({
      attributeId: attribute.id,
      useForVariants: attribute.useForVariants,
      optionIds: attribute.options.map((option) => option.id),
    })),
    // Archived variants stay in history only. Leaving them out keeps them archived.
    variants: product.variants
      .filter((variant) => variant.status === "active")
      .map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        regularPrice: variant.regularPrice,
        salePrice: variant.salePrice ?? "",
        saleStartsAt: toIstInputValue(variant.saleStartsAt),
        saleEndsAt: toIstInputValue(variant.saleEndsAt),
        stockStatus: variant.stockStatus,
        manageStock: variant.manageStock,
        backorderPolicy: variant.backorderPolicy,
        weight: variant.weight ?? "",
        length: variant.length ?? "",
        width: variant.width ?? "",
        height: variant.height ?? "",
        isDefault: variant.isDefault,
        attributeOptions: variant.attributeOptions.map((option) => ({
          attributeId: option.attributeId,
          attributeOptionId: option.attributeOptionId,
        })),
      })),
  };
}

const orNull = (value: string) => (value.trim() ? value.trim() : null);

export function toProductInput(values: ProductFormValues): CreateInput {
  const isSimple = values.productType === "simple";
  return {
    name: values.name,
    slug: values.slug,
    shortDescription: orNull(values.shortDescription),
    description: orNull(values.description),
    productType: values.productType,
    taxStatus: values.taxStatus,
    taxClass: orNull(values.taxClass),
    categoryIds: values.categoryIds,
    tagIds: values.tagIds,
    attributes: values.attributes.map((attribute) => ({
      ...attribute,
      useForVariants: isSimple ? false : attribute.useForVariants,
    })),
    variants: values.variants.map((variant, index) => ({
      id: variant.id,
      // A simple product's only variant carries the product name.
      name: isSimple ? values.name : variant.name || values.name,
      sku: variant.sku.trim(),
      regularPrice: variant.regularPrice.trim(),
      salePrice: orNull(variant.salePrice),
      saleStartsAt: fromIstInputValue(variant.saleStartsAt),
      saleEndsAt: fromIstInputValue(variant.saleEndsAt),
      stockStatus: variant.stockStatus,
      manageStock: variant.manageStock,
      backorderPolicy: variant.backorderPolicy,
      weight: orNull(variant.weight),
      length: orNull(variant.length),
      width: orNull(variant.width),
      height: orNull(variant.height),
      isDefault: isSimple ? index === 0 : variant.isDefault,
      attributeOptions: isSimple ? [] : variant.attributeOptions,
    })),
  };
}

export function combinationKey(
  options: Array<{ attributeId: string; attributeOptionId: string }>,
) {
  return options
    .map((option) => `${option.attributeId}:${option.attributeOptionId}`)
    .sort()
    .join("|");
}
