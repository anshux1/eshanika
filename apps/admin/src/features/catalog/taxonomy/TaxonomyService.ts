import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "@/orpc/audit";
import {
  type AttributeRecord,
  type CategoryRecord,
  type OptionRecord,
  PrismaTaxonomyRepository,
  type TagRecord,
} from "./PrismaTaxonomyRepository";
import type {
  AttributeCreateInput,
  AttributeListInput,
  AttributeUpdateInput,
  CategoryCreateInput,
  CategoryListInput,
  CategoryReparentInput,
  CategoryUpdateInput,
  OptionCreateInput,
  OptionListInput,
  OptionUpdateInput,
  ReorderInput,
  TagCreateInput,
  TagListInput,
  TagUpdateInput,
  VersionInput,
} from "./schema";

// Used when a rule reads other rows before writing (sibling positions, swatch
// colours, tag usage), so two admins cannot race past the same check. Single-row
// edits rely on the `updatedAt` check instead.
const SERIALIZABLE = { isolationLevel: "Serializable" as const };

type Editable = { status?: "active" | "archived"; updatedAt: Date };

function assertEditable<T extends Editable>(
  record: T | null,
  expectedUpdatedAt: string,
  label: string,
): T {
  if (!record) {
    throw new AdminError("NOT_FOUND", `This ${label} was not found.`);
  }
  if (record.status === "archived") {
    throw new AdminError(
      "CONFLICT",
      `This ${label} is archived and cannot be changed.`,
    );
  }
  if (record.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
    throw new AdminError(
      "CONFLICT",
      `This ${label} changed. Reload it and try again.`,
    );
  }
  return record;
}

function assertSaved(saved: boolean, label: string): void {
  if (!saved) {
    throw new AdminError(
      "CONFLICT",
      `This ${label} changed. Reload it and try again.`,
    );
  }
}

function assertFound<T>(record: T | null, label: string): T {
  if (!record) {
    throw new AdminError("NOT_FOUND", `This ${label} was not found.`);
  }
  return record;
}

function nextSortOrder(siblings: { sortOrder: number }[]): number {
  let highest = -1;
  for (const sibling of siblings) {
    highest = Math.max(highest, sibling.sortOrder);
  }
  return highest + 1;
}

// Returns the sibling IDs with `id` moved to `position`, or null when it is already there.
function moveTo(
  siblings: { id: string }[],
  id: string,
  position: number,
): string[] | null {
  const ids = siblings.map((sibling) => sibling.id);
  const currentPosition = ids.indexOf(id);
  if (currentPosition < 0) {
    throw new AdminError("NOT_FOUND", "The record was not found in this list.");
  }
  if (position >= ids.length) {
    throw new AdminError(
      "BAD_REQUEST",
      "The requested position is outside this list.",
    );
  }
  if (currentPosition === position) return null;
  ids.splice(currentPosition, 1);
  ids.splice(position, 0, id);
  return ids;
}

function toCategory({ _count, ...category }: CategoryRecord) {
  return {
    ...category,
    productCount: _count.categoryProducts,
    childCount: _count.children,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

function toAttribute({ _count, ...attribute }: AttributeRecord) {
  return {
    ...attribute,
    usageCount: _count.productAttributes,
    createdAt: attribute.createdAt.toISOString(),
    updatedAt: attribute.updatedAt.toISOString(),
  };
}

function toOption({ _count, attribute: _attribute, ...option }: OptionRecord) {
  return {
    ...option,
    usageCount: _count.productAttributeOptions + _count.variantAttributeOptions,
    createdAt: option.createdAt.toISOString(),
    updatedAt: option.updatedAt.toISOString(),
  };
}

function toTag({ _count, ...tag }: TagRecord) {
  return {
    ...tag,
    productCount: _count.productTagLinks,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export class TaxonomyService {
  constructor(private readonly repository: PrismaTaxonomyRepository) {}

  // Categories

  async listCategories(input: CategoryListInput) {
    const rows = await this.repository.listCategories({
      ...input,
      status: input.status ?? "active",
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: page.items.map(toCategory) };
  }

  createCategory(input: CategoryCreateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const parentId = input.parentId ?? null;
      if (parentId) {
        const parent = await repository.findCategoryParent(parentId);
        if (parent?.status !== "active") {
          throw new AdminError(
            "BAD_REQUEST",
            "Choose an active parent category.",
          );
        }
      }
      const siblings = await repository.listCategorySiblings(parentId);
      const category = await repository.createCategory({
        parentId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        sortOrder: nextSortOrder(siblings),
      });
      await repository.writeAudit(actor, {
        action: "catalog.category.created",
        entityType: "category",
        entityId: category.id,
        afterData: { name: category.name, slug: category.slug, parentId },
      });
      return toCategory(category);
    }, SERIALIZABLE);
  }

  updateCategory(input: CategoryUpdateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findCategory(input.id),
        input.expectedUpdatedAt,
        "category",
      );
      const saved = await repository.updateCategory(
        current.id,
        current.updatedAt,
        { name: input.name, slug: input.slug, description: input.description },
      );
      assertSaved(saved, "category");
      const updated = assertFound(
        await repository.findCategory(current.id),
        "category",
      );
      await repository.writeAudit(actor, {
        action: "catalog.category.updated",
        entityType: "category",
        entityId: current.id,
        beforeData: {
          name: current.name,
          slug: current.slug,
          description: current.description,
        },
        afterData: {
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
        },
      });
      return toCategory(updated);
    });
  }

  reparentCategory(input: CategoryReparentInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findCategory(input.id),
        input.expectedUpdatedAt,
        "category",
      );
      if (input.parentId === current.parentId) return toCategory(current);

      // Walk up from the new parent. Meeting this category means the move would create a loop.
      let ancestorId = input.parentId;
      while (ancestorId) {
        if (ancestorId === current.id) {
          throw new AdminError(
            "BAD_REQUEST",
            "A category cannot be moved under itself or one of its children.",
          );
        }
        const ancestor = await repository.findCategoryParent(ancestorId);
        if (ancestor?.status !== "active") {
          throw new AdminError(
            "BAD_REQUEST",
            "Choose an active parent category.",
          );
        }
        ancestorId = ancestor.parentId;
      }

      const siblings = await repository.listCategorySiblings(
        input.parentId,
        current.id,
      );
      const saved = await repository.updateCategory(
        current.id,
        current.updatedAt,
        { parentId: input.parentId, sortOrder: nextSortOrder(siblings) },
      );
      assertSaved(saved, "category");
      const updated = assertFound(
        await repository.findCategory(current.id),
        "category",
      );
      await repository.writeAudit(actor, {
        action: "catalog.category.reparented",
        entityType: "category",
        entityId: current.id,
        beforeData: {
          parentId: current.parentId,
          sortOrder: current.sortOrder,
        },
        afterData: { parentId: updated.parentId, sortOrder: updated.sortOrder },
      });
      return toCategory(updated);
    }, SERIALIZABLE);
  }

  reorderCategory(input: ReorderInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findCategory(input.id),
        input.expectedUpdatedAt,
        "category",
      );
      const siblings = await repository.listCategorySiblings(current.parentId);
      const order = moveTo(siblings, current.id, input.sortOrder);
      if (!order) return toCategory(current);

      await repository.setCategoryOrder(order);
      await repository.writeAudit(actor, {
        action: "catalog.category.reordered",
        entityType: "category",
        entityId: current.id,
        beforeData: { order: siblings.map((sibling) => sibling.id) },
        afterData: { order },
      });
      return toCategory(
        assertFound(await repository.findCategory(current.id), "category"),
      );
    }, SERIALIZABLE);
  }

  archiveCategory(input: VersionInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findCategory(input.id),
        input.expectedUpdatedAt,
        "category",
      );
      if (await repository.countActiveChildren(current.id)) {
        throw new AdminError(
          "CONFLICT",
          "Move or archive active child categories before archiving this category.",
        );
      }
      const saved = await repository.updateCategory(
        current.id,
        current.updatedAt,
        { status: "archived" },
      );
      assertSaved(saved, "category");
      await repository.writeAudit(actor, {
        action: "catalog.category.archived",
        entityType: "category",
        entityId: current.id,
        beforeData: { status: "active" },
        afterData: { status: "archived" },
      });
      return toCategory(
        assertFound(await repository.findCategory(current.id), "category"),
      );
    });
  }

  // Attributes

  async listAttributes(input: AttributeListInput) {
    const rows = await this.repository.listAttributes({
      ...input,
      status: input.status ?? "active",
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: page.items.map(toAttribute) };
  }

  createAttribute(input: AttributeCreateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const siblings = await repository.listAttributeSiblings();
      const attribute = await repository.createAttribute({
        name: input.name,
        slug: input.slug,
        displayType: input.displayType,
        sortOrder: nextSortOrder(siblings),
      });
      await repository.writeAudit(actor, {
        action: "catalog.attribute.created",
        entityType: "attribute",
        entityId: attribute.id,
        afterData: {
          name: attribute.name,
          slug: attribute.slug,
          displayType: attribute.displayType,
        },
      });
      return toAttribute(attribute);
    }, SERIALIZABLE);
  }

  updateAttribute(input: AttributeUpdateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findAttribute(input.id),
        input.expectedUpdatedAt,
        "attribute",
      );
      const becomesSwatch =
        input.displayType === "swatch" && current.displayType !== "swatch";
      if (
        becomesSwatch &&
        (await repository.hasOptionWithoutSwatch(current.id))
      ) {
        throw new AdminError(
          "BAD_REQUEST",
          "Add a colour to every active option before switching to swatch display.",
        );
      }
      const saved = await repository.updateAttribute(
        current.id,
        current.updatedAt,
        { name: input.name, slug: input.slug, displayType: input.displayType },
      );
      assertSaved(saved, "attribute");
      const updated = assertFound(
        await repository.findAttribute(current.id),
        "attribute",
      );
      await repository.writeAudit(actor, {
        action: "catalog.attribute.updated",
        entityType: "attribute",
        entityId: current.id,
        beforeData: {
          name: current.name,
          slug: current.slug,
          displayType: current.displayType,
        },
        afterData: {
          name: updated.name,
          slug: updated.slug,
          displayType: updated.displayType,
        },
      });
      return toAttribute(updated);
    }, SERIALIZABLE);
  }

  reorderAttribute(input: ReorderInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findAttribute(input.id),
        input.expectedUpdatedAt,
        "attribute",
      );
      const siblings = await repository.listAttributeSiblings();
      const order = moveTo(siblings, current.id, input.sortOrder);
      if (!order) return toAttribute(current);

      await repository.setAttributeOrder(order);
      await repository.writeAudit(actor, {
        action: "catalog.attribute.reordered",
        entityType: "attribute",
        entityId: current.id,
        beforeData: { order: siblings.map((sibling) => sibling.id) },
        afterData: { order },
      });
      return toAttribute(
        assertFound(await repository.findAttribute(current.id), "attribute"),
      );
    }, SERIALIZABLE);
  }

  archiveAttribute(input: VersionInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findAttribute(input.id),
        input.expectedUpdatedAt,
        "attribute",
      );
      const saved = await repository.updateAttribute(
        current.id,
        current.updatedAt,
        { status: "archived" },
      );
      assertSaved(saved, "attribute");
      await repository.writeAudit(actor, {
        action: "catalog.attribute.archived",
        entityType: "attribute",
        entityId: current.id,
        beforeData: { status: "active" },
        afterData: { status: "archived" },
      });
      return toAttribute(
        assertFound(await repository.findAttribute(current.id), "attribute"),
      );
    });
  }

  // Attribute options

  async listOptions(input: OptionListInput) {
    assertFound(
      await this.repository.findAttribute(input.attributeId),
      "attribute",
    );
    const rows = await this.repository.listOptions({
      ...input,
      status: input.status ?? "active",
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: page.items.map(toOption) };
  }

  createOption(input: OptionCreateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const attribute = assertFound(
        await repository.findAttribute(input.attributeId),
        "attribute",
      );
      if (attribute.status !== "active") {
        throw new AdminError(
          "CONFLICT",
          "This attribute is archived and cannot be changed.",
        );
      }
      if (attribute.displayType === "swatch" && !input.swatchValue) {
        throw new AdminError(
          "BAD_REQUEST",
          "Swatch attributes require a colour for each active option.",
        );
      }
      const siblings = await repository.listOptionSiblings(attribute.id);
      const option = await repository.createOption({
        attributeId: attribute.id,
        name: input.name,
        slug: input.slug,
        swatchValue: input.swatchValue ?? null,
        sortOrder: nextSortOrder(siblings),
      });
      await repository.writeAudit(actor, {
        action: "catalog.attribute_option.created",
        entityType: "attribute_option",
        entityId: option.id,
        afterData: {
          attributeId: option.attributeId,
          name: option.name,
          slug: option.slug,
          swatchValue: option.swatchValue,
        },
      });
      return toOption(option);
    }, SERIALIZABLE);
  }

  updateOption(input: OptionUpdateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findOption(input.id),
        input.expectedUpdatedAt,
        "option",
      );
      if (current.attribute.status !== "active") {
        throw new AdminError(
          "CONFLICT",
          "Options of an archived attribute cannot be changed.",
        );
      }
      if (
        current.attribute.displayType === "swatch" &&
        input.swatchValue === null
      ) {
        throw new AdminError(
          "BAD_REQUEST",
          "Swatch options must keep a colour value.",
        );
      }
      const saved = await repository.updateOption(
        current.id,
        current.updatedAt,
        { name: input.name, slug: input.slug, swatchValue: input.swatchValue },
      );
      assertSaved(saved, "option");
      const updated = assertFound(
        await repository.findOption(current.id),
        "option",
      );
      await repository.writeAudit(actor, {
        action: "catalog.attribute_option.updated",
        entityType: "attribute_option",
        entityId: current.id,
        beforeData: {
          name: current.name,
          slug: current.slug,
          swatchValue: current.swatchValue,
        },
        afterData: {
          name: updated.name,
          slug: updated.slug,
          swatchValue: updated.swatchValue,
        },
      });
      return toOption(updated);
    }, SERIALIZABLE);
  }

  reorderOption(input: ReorderInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findOption(input.id),
        input.expectedUpdatedAt,
        "option",
      );
      if (current.attribute.status !== "active") {
        throw new AdminError(
          "CONFLICT",
          "Options of an archived attribute cannot be changed.",
        );
      }
      const siblings = await repository.listOptionSiblings(current.attributeId);
      const order = moveTo(siblings, current.id, input.sortOrder);
      if (!order) return toOption(current);

      await repository.setOptionOrder(order);
      await repository.writeAudit(actor, {
        action: "catalog.attribute_option.reordered",
        entityType: "attribute_option",
        entityId: current.id,
        beforeData: { order: siblings.map((sibling) => sibling.id) },
        afterData: { order },
      });
      return toOption(
        assertFound(await repository.findOption(current.id), "option"),
      );
    }, SERIALIZABLE);
  }

  archiveOption(input: VersionInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findOption(input.id),
        input.expectedUpdatedAt,
        "option",
      );
      const saved = await repository.updateOption(
        current.id,
        current.updatedAt,
        { status: "archived" },
      );
      assertSaved(saved, "option");
      await repository.writeAudit(actor, {
        action: "catalog.attribute_option.archived",
        entityType: "attribute_option",
        entityId: current.id,
        beforeData: { status: "active" },
        afterData: { status: "archived" },
      });
      return toOption(
        assertFound(await repository.findOption(current.id), "option"),
      );
    });
  }

  // Tags

  async listTags(input: TagListInput) {
    const rows = await this.repository.listTags(input);
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: page.items.map(toTag) };
  }

  createTag(input: TagCreateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const tag = await repository.createTag({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      });
      await repository.writeAudit(actor, {
        action: "catalog.tag.created",
        entityType: "product_tag",
        entityId: tag.id,
        afterData: {
          name: tag.name,
          slug: tag.slug,
          description: tag.description,
        },
      });
      return toTag(tag);
    });
  }

  updateTag(input: TagUpdateInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findTag(input.id),
        input.expectedUpdatedAt,
        "tag",
      );
      const saved = await repository.updateTag(current.id, current.updatedAt, {
        name: input.name,
        slug: input.slug,
        description: input.description,
      });
      assertSaved(saved, "tag");
      const updated = assertFound(await repository.findTag(current.id), "tag");
      await repository.writeAudit(actor, {
        action: "catalog.tag.updated",
        entityType: "product_tag",
        entityId: current.id,
        beforeData: {
          name: current.name,
          slug: current.slug,
          description: current.description,
        },
        afterData: {
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
        },
      });
      return toTag(updated);
    });
  }

  deleteTag(input: VersionInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.findTag(input.id),
        input.expectedUpdatedAt,
        "tag",
      );
      if (current._count.productTagLinks > 0) {
        throw new AdminError(
          "CONFLICT",
          "Remove this tag from its products before deleting it.",
        );
      }
      assertSaved(
        await repository.deleteTag(current.id, current.updatedAt),
        "tag",
      );
      await repository.writeAudit(actor, {
        action: "catalog.tag.deleted",
        entityType: "product_tag",
        entityId: current.id,
        beforeData: {
          name: current.name,
          slug: current.slug,
          description: current.description,
        },
      });
      return { id: current.id, deleted: true as const };
    }, SERIALIZABLE);
  }
}

export const taxonomyService = new TaxonomyService(
  new PrismaTaxonomyRepository(),
);
