import { adminProcedure } from "@/orpc/procedures";
import { attributeSchemas, categorySchemas, tagSchemas } from "./schema";
import { taxonomyService } from "./TaxonomyService";

const read = adminProcedure();
const write = adminProcedure("catalog.write");

export const taxonomyRouter = {
  categories: {
    list: read
      .input(categorySchemas.list)
      .handler(({ input }) => taxonomyService.listCategories(input)),
    create: write
      .input(categorySchemas.create)
      .handler(({ input, context }) =>
        taxonomyService.createCategory(input, context.actor),
      ),
    update: write
      .input(categorySchemas.update)
      .handler(({ input, context }) =>
        taxonomyService.updateCategory(input, context.actor),
      ),
    reparent: write
      .input(categorySchemas.reparent)
      .handler(({ input, context }) =>
        taxonomyService.reparentCategory(input, context.actor),
      ),
    reorder: write
      .input(categorySchemas.reorder)
      .handler(({ input, context }) =>
        taxonomyService.reorderCategory(input, context.actor),
      ),
    archive: write
      .input(categorySchemas.archive)
      .handler(({ input, context }) =>
        taxonomyService.archiveCategory(input, context.actor),
      ),
  },
  attributes: {
    list: read
      .input(attributeSchemas.list)
      .handler(({ input }) => taxonomyService.listAttributes(input)),
    create: write
      .input(attributeSchemas.create)
      .handler(({ input, context }) =>
        taxonomyService.createAttribute(input, context.actor),
      ),
    update: write
      .input(attributeSchemas.update)
      .handler(({ input, context }) =>
        taxonomyService.updateAttribute(input, context.actor),
      ),
    reorder: write
      .input(attributeSchemas.reorder)
      .handler(({ input, context }) =>
        taxonomyService.reorderAttribute(input, context.actor),
      ),
    archive: write
      .input(attributeSchemas.archive)
      .handler(({ input, context }) =>
        taxonomyService.archiveAttribute(input, context.actor),
      ),
    options: {
      list: read
        .input(attributeSchemas.optionsList)
        .handler(({ input }) => taxonomyService.listOptions(input)),
      create: write
        .input(attributeSchemas.optionCreate)
        .handler(({ input, context }) =>
          taxonomyService.createOption(input, context.actor),
        ),
      update: write
        .input(attributeSchemas.optionUpdate)
        .handler(({ input, context }) =>
          taxonomyService.updateOption(input, context.actor),
        ),
      reorder: write
        .input(attributeSchemas.optionReorder)
        .handler(({ input, context }) =>
          taxonomyService.reorderOption(input, context.actor),
        ),
      archive: write
        .input(attributeSchemas.optionArchive)
        .handler(({ input, context }) =>
          taxonomyService.archiveOption(input, context.actor),
        ),
    },
  },
  tags: {
    list: read
      .input(tagSchemas.list)
      .handler(({ input }) => taxonomyService.listTags(input)),
    create: write
      .input(tagSchemas.create)
      .handler(({ input, context }) =>
        taxonomyService.createTag(input, context.actor),
      ),
    update: write
      .input(tagSchemas.update)
      .handler(({ input, context }) =>
        taxonomyService.updateTag(input, context.actor),
      ),
    delete: write
      .input(tagSchemas.delete)
      .handler(({ input, context }) =>
        taxonomyService.deleteTag(input, context.actor),
      ),
  },
};
