import { db, type Prisma } from "@eshanika/database/db";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  FooterInput,
  MenuItemAddInput,
  MenuItemFields,
  MenuItemUpdateInput,
  MenuLocation,
  MenuReorderInput,
  PageFields,
  PageListInput,
  PageUpdateInput,
} from "./schema";

type Tx = Prisma.TransactionClient;

const SERIALIZABLE = { isolationLevel: "Serializable" } as const;
const FOOTER = "footer";
const MENU_NAMES: Record<MenuLocation, string> = {
  header: "Header menu",
  footer: "Footer menu",
};

const pageSelect = {
  id: true,
  title: true,
  slug: true,
  status: true,
  bodyHtml: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { navigationMenuItems: true } },
} satisfies Prisma.ContentEntrySelect;

const itemSelect = {
  id: true,
  label: true,
  url: true,
  sortOrder: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, status: true } },
  contentEntry: {
    select: { id: true, title: true, slug: true, status: true },
  },
} satisfies Prisma.NavigationMenuItemSelect;

type PageRecord = Prisma.ContentEntryGetPayload<{ select: typeof pageSelect }>;

function toContentPage({ _count, ...page }: PageRecord) {
  return { ...page, menuLinkCount: _count.navigationMenuItems };
}

function assertCurrent(
  record: { updatedAt: Date } | null,
  expectedUpdatedAt: string,
  label: string,
) {
  if (!record)
    throw new AdminError("NOT_FOUND", `This ${label} was not found.`);
  if (record.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime())
    throw new AdminError(
      "CONFLICT",
      `This ${label} changed. Reload and try again.`,
    );
}

async function assertSlugFree(tx: Tx, slug: string, exceptId?: string) {
  const taken = await tx.contentEntry.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (taken && taken.id !== exceptId)
    throw new AdminError("CONFLICT", "Another page already uses this slug.");
}

// Each item points at exactly one thing, and the thing must still be live.
async function targetData(tx: Tx, target: MenuItemFields["target"]) {
  if (target.type === "category") {
    const category = await tx.category.findUnique({
      where: { id: target.categoryId },
      select: { status: true },
    });
    if (category?.status !== "active")
      throw new AdminError("BAD_REQUEST", "Choose an active category.");
    return { categoryId: target.categoryId, contentEntryId: null, url: null };
  }
  if (target.type === "page") {
    const page = await tx.contentEntry.findUnique({
      where: { id: target.contentEntryId },
      select: { kind: true, status: true },
    });
    if (page?.kind !== "page" || page.status === "archived")
      throw new AdminError("BAD_REQUEST", "Choose a page that isn't archived.");
    return {
      categoryId: null,
      contentEntryId: target.contentEntryId,
      url: null,
    };
  }
  return { categoryId: null, contentEntryId: null, url: target.url };
}

async function menuFor(tx: Tx, location: MenuLocation) {
  return tx.navigationMenu.upsert({
    where: { location },
    create: { location, name: MENU_NAMES[location], slug: location },
    update: {},
    select: { id: true },
  });
}

export class PrismaContentRepository {
  async listPages(input: PageListInput) {
    const rows = await db.contentEntry.findMany({
      where: {
        kind: "page",
        status: input.status,
        OR: input.search
          ? [
              { title: { contains: input.search, mode: "insensitive" } },
              { slug: { contains: input.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        _count: { select: { navigationMenuItems: true } },
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return {
      items: page.items.map(({ _count, ...row }) => ({
        ...row,
        menuLinkCount: _count.navigationMenuItems,
      })),
      nextCursor: page.nextCursor,
    };
  }

  async getPage(id: string) {
    const page = await db.contentEntry.findFirst({
      where: { id, kind: "page" },
      select: pageSelect,
    });
    return page ? toContentPage(page) : null;
  }

  createPage(input: PageFields, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        await assertSlugFree(tx, input.slug);
        const page = await tx.contentEntry.create({
          data: {
            kind: "page",
            title: input.title,
            slug: input.slug,
            bodyHtml: input.bodyHtml,
            status: input.status,
            publishedAt: input.status === "published" ? new Date() : null,
          },
          select: pageSelect,
        });
        await audit(tx, actor, {
          action: "content.page.create",
          entityType: "ContentEntry",
          entityId: page.id,
          afterData: { slug: page.slug, status: page.status },
        });
        return toContentPage(page);
      }, SERIALIZABLE),
    );
  }

  updatePage(input: PageUpdateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.contentEntry.findFirst({
          where: { id: input.id, kind: "page" },
          select: pageSelect,
        });
        assertCurrent(current, input.expectedUpdatedAt, "page");
        if (!current) throw new AdminError("NOT_FOUND", "Page not found.");
        if (input.slug !== current.slug)
          await assertSlugFree(tx, input.slug, current.id);
        // The store would show a dead link, so menus must drop the page first.
        if (
          input.status === "archived" &&
          current.status !== "archived" &&
          current._count.navigationMenuItems > 0
        )
          throw new AdminError(
            "CONFLICT",
            "A menu links to this page. Remove the link before archiving it.",
          );
        const page = await tx.contentEntry.update({
          where: { id: input.id },
          data: {
            title: input.title,
            slug: input.slug,
            bodyHtml: input.bodyHtml,
            status: input.status,
            publishedAt:
              input.status === "published" && !current.publishedAt
                ? new Date()
                : undefined,
          },
          select: pageSelect,
        });
        await audit(tx, actor, {
          action: "content.page.update",
          entityType: "ContentEntry",
          entityId: page.id,
          beforeData: { slug: current.slug, status: current.status },
          afterData: { slug: page.slug, status: page.status },
        });
        return toContentPage(page);
      }, SERIALIZABLE),
    );
  }

  async getFooter() {
    return await db.contentEntry.findUnique({
      where: { placement: FOOTER },
      select: { id: true, bodyHtml: true, updatedAt: true },
    });
  }

  saveFooter(input: FooterInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.contentEntry.findUnique({
          where: { placement: FOOTER },
          select: { id: true, updatedAt: true },
        });
        if (current && !input.expectedUpdatedAt)
          throw new AdminError(
            "CONFLICT",
            "Someone else saved the footer first. Reload and try again.",
          );
        if (current && input.expectedUpdatedAt)
          assertCurrent(current, input.expectedUpdatedAt, "footer");
        const footer = current
          ? await tx.contentEntry.update({
              where: { id: current.id },
              data: { bodyHtml: input.bodyHtml },
              select: { id: true, bodyHtml: true, updatedAt: true },
            })
          : await tx.contentEntry.create({
              data: {
                kind: "footer",
                placement: FOOTER,
                title: "Footer",
                slug: FOOTER,
                status: "published",
                publishedAt: new Date(),
                bodyHtml: input.bodyHtml,
              },
              select: { id: true, bodyHtml: true, updatedAt: true },
            });
        await audit(tx, actor, {
          action: "content.footer.save",
          entityType: "ContentEntry",
          entityId: footer.id,
        });
        return footer;
      }, SERIALIZABLE),
    );
  }

  getMenu(location: MenuLocation) {
    return this.getMenuIn(db, location);
  }

  addItem(input: MenuItemAddInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const menu = await menuFor(tx, input.location);
        const last = await tx.navigationMenuItem.aggregate({
          where: { menuId: menu.id },
          _max: { sortOrder: true },
        });
        const item = await tx.navigationMenuItem.create({
          data: {
            menuId: menu.id,
            label: input.label,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
            ...(await targetData(tx, input.target)),
          },
          select: itemSelect,
        });
        await audit(tx, actor, {
          action: "content.menu.addItem",
          entityType: "NavigationMenuItem",
          entityId: item.id,
          afterData: { location: input.location, label: item.label },
        });
        return item;
      }, SERIALIZABLE),
    );
  }

  updateItem(input: MenuItemUpdateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.navigationMenuItem.findUnique({
          where: { id: input.id },
          select: { label: true, updatedAt: true },
        });
        assertCurrent(current, input.expectedUpdatedAt, "menu item");
        const item = await tx.navigationMenuItem.update({
          where: { id: input.id },
          data: { label: input.label, ...(await targetData(tx, input.target)) },
          select: itemSelect,
        });
        await audit(tx, actor, {
          action: "content.menu.updateItem",
          entityType: "NavigationMenuItem",
          entityId: item.id,
          beforeData: { label: current?.label ?? "" },
          afterData: { label: item.label },
        });
        return item;
      }, SERIALIZABLE),
    );
  }

  removeItem(id: string, actor: AdminActor) {
    return db.$transaction(async (tx) => {
      const current = await tx.navigationMenuItem.findUnique({
        where: { id },
        select: { label: true },
      });
      if (!current)
        throw new AdminError("NOT_FOUND", "This menu item was not found.");
      await tx.navigationMenuItem.delete({ where: { id } });
      await audit(tx, actor, {
        action: "content.menu.removeItem",
        entityType: "NavigationMenuItem",
        entityId: id,
        beforeData: { label: current.label },
      });
      return { id };
    });
  }

  reorderItems(input: MenuReorderInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const menu = await tx.navigationMenu.findUnique({
          where: { location: input.location },
          select: {
            id: true,
            navigationMenuItems: { select: { id: true } },
          },
        });
        const existing = new Set(
          menu?.navigationMenuItems.map((item) => item.id) ?? [],
        );
        if (
          !menu ||
          existing.size !== input.itemIds.length ||
          input.itemIds.some((itemId) => !existing.has(itemId))
        )
          throw new AdminError(
            "CONFLICT",
            "This menu changed. Reload and try again.",
          );
        for (const [sortOrder, itemId] of input.itemIds.entries())
          await tx.navigationMenuItem.update({
            where: { id: itemId },
            data: { sortOrder },
          });
        await audit(tx, actor, {
          action: "content.menu.reorder",
          entityType: "NavigationMenu",
          entityId: menu.id,
          afterData: { order: input.itemIds },
        });
        return this.getMenuIn(tx, input.location);
      }, SERIALIZABLE),
    );
  }

  private async getMenuIn(tx: Tx, location: MenuLocation) {
    const menu = await tx.navigationMenu.findUnique({
      where: { location },
      select: {
        navigationMenuItems: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: itemSelect,
        },
      },
    });
    return { location, items: menu?.navigationMenuItems ?? [] };
  }
}
export const contentRepository = new PrismaContentRepository();
