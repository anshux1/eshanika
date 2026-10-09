import { adminProcedure } from "@/orpc/procedures";
import { contentService } from "./ContentService";
import { contentSchemas } from "./schema";

const content = adminProcedure("content.write");

export const contentRouter = {
  pages: {
    list: content
      .input(contentSchemas.listPages)
      .handler(({ input }) => contentService.listPages(input)),
    get: content
      .input(contentSchemas.getPage)
      .handler(({ input }) => contentService.getPage(input.id)),
    create: content
      .input(contentSchemas.createPage)
      .handler(({ input, context }) =>
        contentService.createPage(input, context.actor),
      ),
    update: content
      .input(contentSchemas.updatePage)
      .handler(({ input, context }) =>
        contentService.updatePage(input, context.actor),
      ),
  },
  footer: {
    get: content.handler(() => contentService.getFooter()),
    save: content
      .input(contentSchemas.saveFooter)
      .handler(({ input, context }) =>
        contentService.saveFooter(input, context.actor),
      ),
  },
  menus: {
    get: content
      .input(contentSchemas.getMenu)
      .handler(({ input }) => contentService.getMenu(input.location)),
    addItem: content
      .input(contentSchemas.addItem)
      .handler(({ input, context }) =>
        contentService.addItem(input, context.actor),
      ),
    updateItem: content
      .input(contentSchemas.updateItem)
      .handler(({ input, context }) =>
        contentService.updateItem(input, context.actor),
      ),
    removeItem: content
      .input(contentSchemas.removeItem)
      .handler(({ input, context }) =>
        contentService.removeItem(input.id, context.actor),
      ),
    reorderItems: content
      .input(contentSchemas.reorderItems)
      .handler(({ input, context }) =>
        contentService.reorderItems(input, context.actor),
      ),
  },
};
