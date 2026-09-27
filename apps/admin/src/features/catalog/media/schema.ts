import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const idSchema = z.uuid();
// The `updatedAt` the admin loaded. A save only applies if it still matches.
const revisionSchema = z.coerce.date();

export const listMediaSchema = paginationInput.extend({
  cursor: idSchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.int().min(1).max(100).default(24),
});

export const mediaIdSchema = z.object({ id: idSchema });

export const productIdSchema = z.object({ productId: idSchema });

export const createMediaSchema = z.object({
  storageKey: z.string().startsWith("media/").max(200),
  originalFileName: z.string().trim().min(1).max(255),
});

export const updateAltSchema = z.object({
  id: idSchema,
  altText: z.string().trim().max(500),
  updatedAt: revisionSchema,
});

export const archiveMediaSchema = z.object({
  id: idSchema,
  updatedAt: revisionSchema,
});

export const setProductMediaSchema = z.object({
  productId: idSchema,
  updatedAt: revisionSchema,
  mediaIds: z.array(idSchema).max(50),
  primaryId: idSchema.nullable(),
});

export type ListMediaInput = z.infer<typeof listMediaSchema>;
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateAltInput = z.infer<typeof updateAltSchema>;
export type ArchiveMediaInput = z.infer<typeof archiveMediaSchema>;
export type SetProductMediaInput = z.infer<typeof setProductMediaSchema>;
