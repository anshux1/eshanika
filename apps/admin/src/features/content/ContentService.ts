import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "@/orpc/audit";
import { contentRepository } from "./PrismaContentRepository";
import { sanitizeContentHtml } from "./sanitize";
import type {
  FooterInput,
  MenuItemAddInput,
  MenuItemUpdateInput,
  MenuLocation,
  MenuReorderInput,
  PageFields,
  PageListInput,
  PageUpdateInput,
} from "./schema";

export class ContentService {
  listPages(input: PageListInput) {
    return contentRepository.listPages(input);
  }
  async getPage(id: string) {
    const page = await contentRepository.getPage(id);
    if (!page) throw new AdminError("NOT_FOUND", "Page not found.");
    return page;
  }
  createPage(input: PageFields, actor: AdminActor) {
    return contentRepository.createPage(
      { ...input, bodyHtml: sanitizeContentHtml(input.bodyHtml) },
      actor,
    );
  }
  updatePage(input: PageUpdateInput, actor: AdminActor) {
    return contentRepository.updatePage(
      { ...input, bodyHtml: sanitizeContentHtml(input.bodyHtml) },
      actor,
    );
  }
  getFooter() {
    return contentRepository.getFooter();
  }
  saveFooter(input: FooterInput, actor: AdminActor) {
    return contentRepository.saveFooter(
      { ...input, bodyHtml: sanitizeContentHtml(input.bodyHtml) },
      actor,
    );
  }
  getMenu(location: MenuLocation) {
    return contentRepository.getMenu(location);
  }
  addItem(input: MenuItemAddInput, actor: AdminActor) {
    return contentRepository.addItem(input, actor);
  }
  updateItem(input: MenuItemUpdateInput, actor: AdminActor) {
    return contentRepository.updateItem(input, actor);
  }
  removeItem(id: string, actor: AdminActor) {
    return contentRepository.removeItem(id, actor);
  }
  reorderItems(input: MenuReorderInput, actor: AdminActor) {
    if (new Set(input.itemIds).size !== input.itemIds.length)
      throw new AdminError("BAD_REQUEST", "Each menu item can appear once.");
    return contentRepository.reorderItems(input, actor);
  }
}
export const contentService = new ContentService();
