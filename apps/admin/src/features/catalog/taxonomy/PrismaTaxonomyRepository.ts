import { db, type Prisma } from "@eshanika/database/db";
import type { AttributeStatus, CategoryStatus } from "@eshanika/database/enums";
import { type AdminActor, type AuditEntry, audit } from "@/orpc/audit";

const categorySelect = {
  id: true,
  parentId: true,
  name: true,
  slug: true,
  description: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      categoryProducts: true,
      children: { where: { status: "active" } },
    },
  },
} satisfies Prisma.CategorySelect;

const attributeSelect = {
  id: true,
  name: true,
  slug: true,
  displayType: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { productAttributes: true } },
} satisfies Prisma.AttributeSelect;

const optionSelect = {
  id: true,
  attributeId: true,
  name: true,
  slug: true,
  swatchValue: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  attribute: { select: { displayType: true, status: true } },
  _count: {
    select: { productAttributeOptions: true, variantAttributeOptions: true },
  },
} satisfies Prisma.AttributeOptionSelect;

const tagSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { productTagLinks: true } },
} satisfies Prisma.ProductTagSelect;

export type CategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof categorySelect;
}>;
export type AttributeRecord = Prisma.AttributeGetPayload<{
  select: typeof attributeSelect;
}>;
export type OptionRecord = Prisma.AttributeOptionGetPayload<{
  select: typeof optionSelect;
}>;
export type TagRecord = Prisma.ProductTagGetPayload<{
  select: typeof tagSelect;
}>;

type ListArgs = { limit: number; cursor?: string; search?: string };

function searchName(search: string | undefined) {
  return search
    ? { contains: search, mode: "insensitive" as const }
    : undefined;
}

function pageArgs({ limit, cursor }: ListArgs) {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

const bySortOrder = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

export class PrismaTaxonomyRepository {
  constructor(private readonly client: Prisma.TransactionClient = db) {}

  transaction<T>(
    work: (repository: PrismaTaxonomyRepository) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    return db.$transaction(
      (tx) => work(new PrismaTaxonomyRepository(tx)),
      options,
    );
  }

  writeAudit(actor: AdminActor, entry: AuditEntry): Promise<void> {
    return audit(this.client, actor, entry);
  }

  // Categories

  listCategories(
    args: ListArgs & { parentId?: string | null; status: CategoryStatus },
  ): Promise<CategoryRecord[]> {
    return this.client.category.findMany({
      where: {
        parentId: args.parentId,
        status: args.status,
        name: searchName(args.search),
      },
      orderBy: bySortOrder,
      select: categorySelect,
      ...pageArgs(args),
    });
  }

  findCategory(id: string): Promise<CategoryRecord | null> {
    return this.client.category.findUnique({
      where: { id },
      select: categorySelect,
    });
  }

  findCategoryParent(id: string) {
    return this.client.category.findUnique({
      where: { id },
      select: { parentId: true, status: true },
    });
  }

  listCategorySiblings(parentId: string | null, excludeId?: string) {
    return this.client.category.findMany({
      where: { parentId, status: "active", id: { not: excludeId } },
      orderBy: bySortOrder,
      select: { id: true, sortOrder: true },
    });
  }

  countActiveChildren(id: string): Promise<number> {
    return this.client.category.count({
      where: { parentId: id, status: "active" },
    });
  }

  createCategory(
    data: Prisma.CategoryUncheckedCreateInput,
  ): Promise<CategoryRecord> {
    return this.client.category.create({ data, select: categorySelect });
  }

  // Only matches an active row that still has the revision the admin loaded.
  async updateCategory(
    id: string,
    updatedAt: Date,
    data: Prisma.CategoryUncheckedUpdateManyInput,
  ): Promise<boolean> {
    const result = await this.client.category.updateMany({
      where: { id, updatedAt, status: "active" },
      data,
    });
    return result.count === 1;
  }

  async setCategoryOrder(ids: string[]): Promise<void> {
    for (const [sortOrder, id] of ids.entries()) {
      await this.client.category.update({ where: { id }, data: { sortOrder } });
    }
  }

  // Attributes

  listAttributes(
    args: ListArgs & { status: AttributeStatus },
  ): Promise<AttributeRecord[]> {
    return this.client.attribute.findMany({
      where: { status: args.status, name: searchName(args.search) },
      orderBy: bySortOrder,
      select: attributeSelect,
      ...pageArgs(args),
    });
  }

  findAttribute(id: string): Promise<AttributeRecord | null> {
    return this.client.attribute.findUnique({
      where: { id },
      select: attributeSelect,
    });
  }

  listAttributeSiblings() {
    return this.client.attribute.findMany({
      where: { status: "active" },
      orderBy: bySortOrder,
      select: { id: true, sortOrder: true },
    });
  }

  async hasOptionWithoutSwatch(attributeId: string): Promise<boolean> {
    const option = await this.client.attributeOption.findFirst({
      where: { attributeId, status: "active", swatchValue: null },
      select: { id: true },
    });
    return option !== null;
  }

  createAttribute(
    data: Prisma.AttributeUncheckedCreateInput,
  ): Promise<AttributeRecord> {
    return this.client.attribute.create({ data, select: attributeSelect });
  }

  async updateAttribute(
    id: string,
    updatedAt: Date,
    data: Prisma.AttributeUncheckedUpdateManyInput,
  ): Promise<boolean> {
    const result = await this.client.attribute.updateMany({
      where: { id, updatedAt, status: "active" },
      data,
    });
    return result.count === 1;
  }

  async setAttributeOrder(ids: string[]): Promise<void> {
    for (const [sortOrder, id] of ids.entries()) {
      await this.client.attribute.update({
        where: { id },
        data: { sortOrder },
      });
    }
  }

  // Attribute options

  listOptions(
    args: ListArgs & { attributeId: string; status: AttributeStatus },
  ): Promise<OptionRecord[]> {
    return this.client.attributeOption.findMany({
      where: {
        attributeId: args.attributeId,
        status: args.status,
        name: searchName(args.search),
      },
      orderBy: bySortOrder,
      select: optionSelect,
      ...pageArgs(args),
    });
  }

  findOption(id: string): Promise<OptionRecord | null> {
    return this.client.attributeOption.findUnique({
      where: { id },
      select: optionSelect,
    });
  }

  listOptionSiblings(attributeId: string) {
    return this.client.attributeOption.findMany({
      where: { attributeId, status: "active" },
      orderBy: bySortOrder,
      select: { id: true, sortOrder: true },
    });
  }

  createOption(
    data: Prisma.AttributeOptionUncheckedCreateInput,
  ): Promise<OptionRecord> {
    return this.client.attributeOption.create({ data, select: optionSelect });
  }

  async updateOption(
    id: string,
    updatedAt: Date,
    data: Prisma.AttributeOptionUncheckedUpdateManyInput,
  ): Promise<boolean> {
    const result = await this.client.attributeOption.updateMany({
      where: { id, updatedAt, status: "active" },
      data,
    });
    return result.count === 1;
  }

  async setOptionOrder(ids: string[]): Promise<void> {
    for (const [sortOrder, id] of ids.entries()) {
      await this.client.attributeOption.update({
        where: { id },
        data: { sortOrder },
      });
    }
  }

  // Tags

  listTags(args: ListArgs): Promise<TagRecord[]> {
    const search = searchName(args.search);
    return this.client.productTag.findMany({
      where: search ? { OR: [{ name: search }, { slug: search }] } : {},
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: tagSelect,
      ...pageArgs(args),
    });
  }

  findTag(id: string): Promise<TagRecord | null> {
    return this.client.productTag.findUnique({
      where: { id },
      select: tagSelect,
    });
  }

  createTag(data: Prisma.ProductTagUncheckedCreateInput): Promise<TagRecord> {
    return this.client.productTag.create({ data, select: tagSelect });
  }

  async updateTag(
    id: string,
    updatedAt: Date,
    data: Prisma.ProductTagUncheckedUpdateManyInput,
  ): Promise<boolean> {
    const result = await this.client.productTag.updateMany({
      where: { id, updatedAt },
      data,
    });
    return result.count === 1;
  }

  async deleteTag(id: string, updatedAt: Date): Promise<boolean> {
    const result = await this.client.productTag.deleteMany({
      where: { id, updatedAt },
    });
    return result.count === 1;
  }
}
