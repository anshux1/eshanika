import { ContentEntryStatus } from "@eshanika/database/enums";
import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and dashes",
  );
const bodyHtml = z.string().max(500_000);

export const MENU_LOCATIONS = ["header", "footer"] as const;

// Site-relative paths or https links only, so a menu can never run script.
export const menuUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) =>
      (value.startsWith("/") && !value.startsWith("//")) ||
      /^https:\/\/[^\s/]+/.test(value),
    "Use a path like /about or a full https:// link",
  );

const target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("category"), categoryId: id }),
  z.object({ type: z.literal("page"), contentEntryId: id }),
  z.object({ type: z.literal("url"), url: menuUrl }),
]);
const pageFields = z.object({
  title: z.string().trim().min(1).max(200),
  slug,
  bodyHtml,
  status: z.enum(ContentEntryStatus),
});
const itemFields = z.object({
  label: z.string().trim().min(1).max(80),
  target,
});
const location = z.enum(MENU_LOCATIONS);

export const contentSchemas = {
  listPages: paginationInput.extend({
    cursor: id.optional(),
    status: z.enum(ContentEntryStatus).optional(),
    search: z.string().trim().max(120).optional(),
  }),
  getPage: z.object({ id }),
  createPage: pageFields,
  updatePage: pageFields.extend({ id, expectedUpdatedAt: timestamp }),
  saveFooter: z.object({
    bodyHtml,
    expectedUpdatedAt: timestamp.nullable(),
  }),
  getMenu: z.object({ location }),
  addItem: itemFields.extend({ location }),
  updateItem: itemFields.extend({ id, expectedUpdatedAt: timestamp }),
  removeItem: z.object({ id }),
  reorderItems: z.object({ location, itemIds: z.array(id).max(200) }),
};
export type PageListInput = z.infer<typeof contentSchemas.listPages>;
export type PageFields = z.infer<typeof pageFields>;
export type PageUpdateInput = z.infer<typeof contentSchemas.updatePage>;
export type FooterInput = z.infer<typeof contentSchemas.saveFooter>;
export type MenuLocation = z.infer<typeof location>;
export type MenuItemFields = z.infer<typeof itemFields>;
export type MenuItemAddInput = z.infer<typeof contentSchemas.addItem>;
export type MenuItemUpdateInput = z.infer<typeof contentSchemas.updateItem>;
export type MenuReorderInput = z.infer<typeof contentSchemas.reorderItems>;
