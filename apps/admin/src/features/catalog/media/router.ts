import { adminProcedure } from "@/orpc/procedures";
import { mediaService } from "./MediaService";
import {
  archiveMediaSchema,
  createMediaSchema,
  listMediaSchema,
  mediaIdSchema,
  productIdSchema,
  setProductMediaSchema,
  updateAltSchema,
} from "./schema";

export const mediaRouter = {
  list: adminProcedure()
    .input(listMediaSchema)
    .handler(({ input }) => mediaService.list(input)),
  get: adminProcedure()
    .input(mediaIdSchema)
    .handler(({ input }) => mediaService.get(input.id)),
  getProductMedia: adminProcedure()
    .input(productIdSchema)
    .handler(({ input }) => mediaService.getProductMedia(input.productId)),
  create: adminProcedure("catalog.write")
    .input(createMediaSchema)
    .handler(({ input, context }) => mediaService.create(input, context.actor)),
  updateAlt: adminProcedure("catalog.write")
    .input(updateAltSchema)
    .handler(({ input, context }) =>
      mediaService.updateAlt(input, context.actor),
    ),
  archive: adminProcedure("catalog.write")
    .input(archiveMediaSchema)
    .handler(({ input, context }) =>
      mediaService.archive(input, context.actor),
    ),
  setProductMedia: adminProcedure("catalog.write")
    .input(setProductMediaSchema)
    .handler(({ input, context }) =>
      mediaService.setProductMedia(input, context.actor),
    ),
};
