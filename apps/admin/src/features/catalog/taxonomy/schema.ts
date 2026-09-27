import {
  AttributeDisplayType,
  AttributeStatus,
  CategoryStatus,
} from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const idSchema = z.uuid();
const nameSchema = z.string().trim().min(1).max(120);
const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const descriptionSchema = z.string().trim().max(5000).nullable();
const expectedUpdatedAtSchema = z.iso.datetime({ offset: true });
const swatchValueSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  .nullable();
const changeRequired = { message: "Change at least one field" };

const listPageSchema = paginationInput.extend({
  cursor: idSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

// `sortOrder` is the zero-based position the record moves to among its siblings.
const reorderSchema = z.object({
  id: idSchema,
  sortOrder: z.int().min(0).max(2_000_000_000),
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

const versionSchema = z.object({
  id: idSchema,
  expectedUpdatedAt: expectedUpdatedAtSchema,
});

export const categorySchemas = {
  list: listPageSchema.extend({
    parentId: idSchema.nullable().optional(),
    status: z.enum(CategoryStatus).optional(),
  }),
  create: z.object({
    parentId: idSchema.nullable().optional(),
    name: nameSchema,
    slug: slugSchema,
    description: descriptionSchema.optional(),
  }),
  update: versionSchema
    .extend({
      name: nameSchema.optional(),
      slug: slugSchema.optional(),
      description: descriptionSchema.optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined ||
        input.slug !== undefined ||
        input.description !== undefined,
      changeRequired,
    ),
  reparent: versionSchema.extend({ parentId: idSchema.nullable() }),
  reorder: reorderSchema,
  archive: versionSchema,
};

export const attributeSchemas = {
  list: listPageSchema.extend({
    status: z.enum(AttributeStatus).optional(),
  }),
  create: z.object({
    name: nameSchema,
    slug: slugSchema,
    displayType: z.enum(AttributeDisplayType).default("select"),
  }),
  update: versionSchema
    .extend({
      name: nameSchema.optional(),
      slug: slugSchema.optional(),
      displayType: z.enum(AttributeDisplayType).optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined ||
        input.slug !== undefined ||
        input.displayType !== undefined,
      changeRequired,
    ),
  reorder: reorderSchema,
  archive: versionSchema,
  optionsList: listPageSchema.extend({
    attributeId: idSchema,
    status: z.enum(AttributeStatus).optional(),
  }),
  optionCreate: z.object({
    attributeId: idSchema,
    name: nameSchema,
    slug: slugSchema,
    swatchValue: swatchValueSchema.optional(),
  }),
  optionUpdate: versionSchema
    .extend({
      name: nameSchema.optional(),
      slug: slugSchema.optional(),
      swatchValue: swatchValueSchema.optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined ||
        input.slug !== undefined ||
        input.swatchValue !== undefined,
      changeRequired,
    ),
  optionReorder: reorderSchema,
  optionArchive: versionSchema,
};

export const tagSchemas = {
  list: listPageSchema,
  create: z.object({
    name: nameSchema,
    slug: slugSchema,
    description: descriptionSchema.optional(),
  }),
  update: versionSchema
    .extend({
      name: nameSchema.optional(),
      slug: slugSchema.optional(),
      description: descriptionSchema.optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined ||
        input.slug !== undefined ||
        input.description !== undefined,
      changeRequired,
    ),
  delete: versionSchema,
};

export type ReorderInput = z.infer<typeof reorderSchema>;
export type VersionInput = z.infer<typeof versionSchema>;
export type CategoryListInput = z.infer<typeof categorySchemas.list>;
export type CategoryCreateInput = z.infer<typeof categorySchemas.create>;
export type CategoryUpdateInput = z.infer<typeof categorySchemas.update>;
export type CategoryReparentInput = z.infer<typeof categorySchemas.reparent>;
export type AttributeListInput = z.infer<typeof attributeSchemas.list>;
export type AttributeCreateInput = z.infer<typeof attributeSchemas.create>;
export type AttributeUpdateInput = z.infer<typeof attributeSchemas.update>;
export type OptionListInput = z.infer<typeof attributeSchemas.optionsList>;
export type OptionCreateInput = z.infer<typeof attributeSchemas.optionCreate>;
export type OptionUpdateInput = z.infer<typeof attributeSchemas.optionUpdate>;
export type TagListInput = z.infer<typeof tagSchemas.list>;
export type TagCreateInput = z.infer<typeof tagSchemas.create>;
export type TagUpdateInput = z.infer<typeof tagSchemas.update>;
