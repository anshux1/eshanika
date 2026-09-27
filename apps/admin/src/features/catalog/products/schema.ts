import {
  BackorderPolicy,
  ProductStatus,
  ProductTaxStatus,
  ProductType,
  VariantStockStatus,
} from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens",
  );

const productIdSchema = z.uuid();
const decimalMoneySchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    "Enter an amount with up to two decimal places",
  );
const decimalMeasurementSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/,
    "Enter a measurement with up to three decimal places",
  )
  .nullable();
const optionalDateSchema = z.iso.datetime().nullable();

const variantAttributeOptionSchema = z.object({
  attributeId: z.uuid(),
  attributeOptionId: z.uuid(),
});

export const productVariantInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(250),
  sku: z.string().trim().min(1).max(100),
  regularPrice: decimalMoneySchema,
  salePrice: decimalMoneySchema.nullable().default(null),
  currencyCode: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .default("INR"),
  saleStartsAt: optionalDateSchema.default(null),
  saleEndsAt: optionalDateSchema.default(null),
  stockStatus: z.enum(VariantStockStatus).default("in_stock"),
  manageStock: z.boolean().default(false),
  backorderPolicy: z.enum(BackorderPolicy).default("no"),
  weight: decimalMeasurementSchema.default(null),
  length: decimalMeasurementSchema.default(null),
  width: decimalMeasurementSchema.default(null),
  height: decimalMeasurementSchema.default(null),
  isDefault: z.boolean().default(false),
  attributeOptions: z.array(variantAttributeOptionSchema).max(6).default([]),
});

export const productAttributeInputSchema = z.object({
  attributeId: z.uuid(),
  useForVariants: z.boolean(),
  optionIds: z.array(z.uuid()).min(1).max(64),
});

const productFieldsSchema = z.object({
  name: z.string().trim().min(1).max(250),
  slug: slugSchema,
  description: z.string().max(50_000).nullable().default(null),
  shortDescription: z.string().max(1_000).nullable().default(null),
  productType: z.enum(ProductType).default("simple"),
  taxStatus: z.enum(ProductTaxStatus).default("taxable"),
  taxClass: z.string().trim().max(100).nullable().default(null),
  categoryIds: z.array(z.uuid()).max(100).default([]),
  tagIds: z.array(z.uuid()).max(100).default([]),
  attributes: z.array(productAttributeInputSchema).max(6).default([]),
  variants: z.array(productVariantInputSchema).min(1).max(256),
});

export const createProductInputSchema = productFieldsSchema;

export const updateProductInputSchema = productFieldsSchema.extend({
  id: productIdSchema,
  expectedUpdatedAt: z.iso.datetime(),
});

export const listProductsInputSchema = paginationInput.extend({
  cursor: z.uuid().optional(),
  search: z.string().trim().max(200).optional(),
  status: z.enum(ProductStatus).optional(),
  categoryId: z.uuid().optional(),
  tagId: z.uuid().optional(),
  sortBy: z
    .enum(["name", "createdAt", "updatedAt", "status"])
    .default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const getProductInputSchema = z.object({ id: productIdSchema });

export const changeProductStatusInputSchema = z.object({
  id: productIdSchema,
  status: z.enum(ProductStatus),
  expectedUpdatedAt: z.iso.datetime(),
});

export const bulkProductStatusInputSchema = z
  .object({
    ids: z.array(productIdSchema).min(1).max(100),
    action: z.enum(["publish", "archive"]),
  })
  .refine(({ ids }) => new Set(ids).size === ids.length, {
    message: "Choose each product only once",
    path: ["ids"],
  });

export const generateVariantCombinationsInputSchema = z.object({
  attributes: z
    .array(
      z.object({
        attributeId: z.uuid(),
        optionIds: z.array(z.uuid()).min(1).max(64),
      }),
    )
    .min(1)
    .max(6),
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type ProductAttributeInput = z.infer<typeof productAttributeInputSchema>;
export type ListProductsInput = z.infer<typeof listProductsInputSchema>;
export type ChangeProductStatusInput = z.infer<
  typeof changeProductStatusInputSchema
>;
export type BulkProductStatusInput = z.infer<
  typeof bulkProductStatusInputSchema
>;
export type GenerateVariantCombinationsInput = z.infer<
  typeof generateVariantCombinationsInputSchema
>;
