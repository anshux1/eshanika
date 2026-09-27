import { randomUUID } from "node:crypto";
import { db, type Prisma } from "@eshanika/database/db";
import { type Page, toPage } from "@eshanika/orpc/pagination";
import { type AdminActor, type AuditEntry, audit } from "@/orpc/audit";
import type {
  ListProductsInput,
  ProductAttributeInput,
  ProductVariantInput,
} from "./schema";
import type { ProductDetail, ProductListItem, PublishState } from "./types";

const listSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  productType: true,
  taxStatus: true,
  createdAt: true,
  updatedAt: true,
  categoryProducts: {
    orderBy: [{ sortOrder: "asc" }, { categoryId: "asc" }],
    select: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
  productTagLinks: {
    orderBy: { tagId: "asc" },
    select: {
      tag: { select: { id: true, name: true, slug: true } },
    },
  },
  productVariants: {
    where: { archivedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      regularPrice: true,
      salePrice: true,
      isDefault: true,
      status: true,
    },
  },
  productMedia: {
    where: { role: "primary" },
    orderBy: { sortOrder: "asc" },
    select: {
      mediaAsset: { select: { id: true, altText: true, status: true } },
    },
  },
} satisfies Prisma.ProductSelect;

// The detail page shows everything in a list row plus the fields below.
// `productVariants` is replaced because the editor also needs archived variants.
const detailSelect = {
  ...listSelect,
  description: true,
  shortDescription: true,
  taxClass: true,
  publishedAt: true,
  archivedAt: true,
  productAttributes: {
    orderBy: [{ sortOrder: "asc" }, { attributeId: "asc" }],
    select: {
      attributeId: true,
      sortOrder: true,
      useForVariants: true,
      attribute: { select: { id: true, name: true, slug: true } },
    },
  },
  productAttributeOptions: {
    select: {
      attributeId: true,
      attributeOptionId: true,
      attributeOption: {
        select: { id: true, name: true, slug: true, swatchValue: true },
      },
    },
  },
  productVariants: {
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      regularPrice: true,
      salePrice: true,
      currencyCode: true,
      saleStartsAt: true,
      saleEndsAt: true,
      stockStatus: true,
      manageStock: true,
      backorderPolicy: true,
      weight: true,
      length: true,
      width: true,
      height: true,
      isDefault: true,
      status: true,
      archivedAt: true,
      variantAttributeOptions: {
        orderBy: [{ attributeId: "asc" }],
        select: {
          attributeId: true,
          attributeOptionId: true,
          attributeOption: { select: { name: true, slug: true } },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect;

type ListRecord = Prisma.ProductGetPayload<{ select: typeof listSelect }>;
type DetailRecord = Prisma.ProductGetPayload<{ select: typeof detailSelect }>;

const publishSelect = {
  id: true,
  name: true,
  status: true,
  updatedAt: true,
  productVariants: {
    where: { status: "active", archivedAt: null },
    select: {
      status: true,
      archivedAt: true,
      isDefault: true,
      regularPrice: true,
    },
  },
  productMedia: {
    where: { role: "primary" },
    select: { mediaAsset: { select: { altText: true, status: true } } },
  },
} satisfies Prisma.ProductSelect;

function toIso(date: Date | null): string | null {
  return date?.toISOString() ?? null;
}

function serializeListRecord(record: ListRecord): ProductListItem {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    status: record.status,
    productType: record.productType,
    taxStatus: record.taxStatus,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    categories: record.categoryProducts.map(({ category }) => category),
    tags: record.productTagLinks.map(({ tag }) => tag),
    variants: record.productVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      regularPrice: variant.regularPrice.toString(),
      salePrice: variant.salePrice?.toString() ?? null,
      isDefault: variant.isDefault,
      status: variant.status,
    })),
    primaryMedia: record.productMedia.map(({ mediaAsset }) => mediaAsset),
  };
}

function serializeDetailRecord(record: DetailRecord): ProductDetail {
  const optionsByAttribute = new Map<
    string,
    Array<{
      id: string;
      name: string;
      slug: string;
      swatchValue: string | null;
    }>
  >();

  for (const optionLink of record.productAttributeOptions) {
    const options = optionsByAttribute.get(optionLink.attributeId) ?? [];
    options.push(optionLink.attributeOption);
    optionsByAttribute.set(optionLink.attributeId, options);
  }

  return {
    ...serializeListRecord(record as ListRecord),
    description: record.description,
    shortDescription: record.shortDescription,
    taxClass: record.taxClass,
    publishedAt: toIso(record.publishedAt),
    archivedAt: toIso(record.archivedAt),
    attributes: record.productAttributes.map(
      ({ attribute, attributeId, sortOrder, useForVariants }) => ({
        id: attribute.id,
        name: attribute.name,
        slug: attribute.slug,
        useForVariants,
        sortOrder,
        options: optionsByAttribute.get(attributeId) ?? [],
      }),
    ),
    variants: record.productVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      regularPrice: variant.regularPrice.toString(),
      salePrice: variant.salePrice?.toString() ?? null,
      currencyCode: variant.currencyCode,
      saleStartsAt: toIso(variant.saleStartsAt),
      saleEndsAt: toIso(variant.saleEndsAt),
      stockStatus: variant.stockStatus,
      manageStock: variant.manageStock,
      backorderPolicy: variant.backorderPolicy,
      weight: variant.weight?.toString() ?? null,
      length: variant.length?.toString() ?? null,
      width: variant.width?.toString() ?? null,
      height: variant.height?.toString() ?? null,
      isDefault: variant.isDefault,
      status: variant.status,
      archivedAt: toIso(variant.archivedAt),
      attributeOptions: variant.variantAttributeOptions.map((option) => ({
        attributeId: option.attributeId,
        attributeOptionId: option.attributeOptionId,
        name: option.attributeOption.name,
        slug: option.attributeOption.slug,
      })),
    })),
  };
}

function toVariantData(variant: ProductVariantInput) {
  return {
    name: variant.name,
    sku: variant.sku,
    regularPrice: variant.regularPrice,
    salePrice: variant.salePrice,
    currencyCode: variant.currencyCode,
    saleStartsAt: variant.saleStartsAt ? new Date(variant.saleStartsAt) : null,
    saleEndsAt: variant.saleEndsAt ? new Date(variant.saleEndsAt) : null,
    stockStatus: variant.stockStatus,
    manageStock: variant.manageStock,
    backorderPolicy: variant.backorderPolicy,
    weight: variant.weight,
    length: variant.length,
    width: variant.width,
    height: variant.height,
    isDefault: variant.isDefault,
    status: "active" as const,
    archivedAt: null,
  };
}

function nextUpdatedAt(current: Date): Date {
  return new Date(Math.max(Date.now(), current.getTime() + 1));
}

function buildProductWhere(input: ListProductsInput): Prisma.ProductWhereInput {
  const search = input.search?.trim();
  return {
    status: input.status,
    categoryProducts: input.categoryId
      ? { some: { categoryId: input.categoryId } }
      : undefined,
    productTagLinks: input.tagId ? { some: { tagId: input.tagId } } : undefined,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
          {
            productVariants: {
              some: { sku: { contains: search, mode: "insensitive" } },
            },
          },
        ]
      : undefined,
  };
}

export type ProductFields = {
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: ProductDetail["productType"];
  taxStatus: ProductDetail["taxStatus"];
  taxClass: string | null;
};

export type ProductLinks = {
  categoryIds: string[];
  tagIds: string[];
  attributes: ProductAttributeInput[];
};

export class PrismaProductRepository {
  constructor(private readonly client: Prisma.TransactionClient = db) {}

  transaction<T>(
    work: (repository: PrismaProductRepository) => Promise<T>,
    options?: {
      isolationLevel?: Prisma.TransactionIsolationLevel;
      timeout?: number;
    },
  ): Promise<T> {
    return db.$transaction(
      (tx) => work(new PrismaProductRepository(tx)),
      options,
    );
  }

  writeAudit(actor: AdminActor, entry: AuditEntry): Promise<void> {
    return audit(this.client, actor, entry);
  }

  async list(input: ListProductsInput): Promise<Page<ProductListItem>> {
    const rows = await this.client.product.findMany({
      where: buildProductWhere(input),
      orderBy: [{ [input.sortBy]: input.sortDirection }, { id: "asc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: listSelect,
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: page.items.map(serializeListRecord) };
  }

  async findById(id: string): Promise<ProductDetail | null> {
    const row = await this.client.product.findUnique({
      where: { id },
      select: detailSelect,
    });
    return row ? serializeDetailRecord(row) : null;
  }

  // A light read for bulk actions: only what the publish rules look at.
  async findPublishStates(ids: string[]): Promise<PublishState[]> {
    const rows = await this.client.product.findMany({
      where: { id: { in: ids } },
      select: publishSelect,
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      updatedAt: row.updatedAt,
      variants: row.productVariants.map((variant) => ({
        ...variant,
        regularPrice: variant.regularPrice.toString(),
        archivedAt: null,
      })),
      primaryMedia: row.productMedia.map(({ mediaAsset }) => mediaAsset),
    }));
  }

  async findLinkedIds(productId: string) {
    const categories = await this.client.categoryProduct.findMany({
      where: { productId },
      select: { categoryId: true },
    });
    const attributes = await this.client.productAttribute.findMany({
      where: { productId },
      select: { attributeId: true },
    });
    const options = await this.client.productAttributeOption.findMany({
      where: { productId },
      select: { attributeOptionId: true },
    });
    return {
      categoryIds: new Set(categories.map((row) => row.categoryId)),
      attributeIds: new Set(attributes.map((row) => row.attributeId)),
      optionIds: new Set(options.map((row) => row.attributeOptionId)),
    };
  }

  findCategories(ids: string[]) {
    return this.client.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
  }

  countTags(ids: string[]): Promise<number> {
    return this.client.productTag.count({ where: { id: { in: ids } } });
  }

  findAttributes(ids: string[]) {
    return this.client.attribute.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
  }

  findOptions(ids: string[]) {
    return this.client.attributeOption.findMany({
      where: { id: { in: ids } },
      select: { id: true, attributeId: true, status: true },
    });
  }

  // `inUse` means carts, orders, or stock records point at the variant, so it
  // cannot be deleted without breaking history.
  async findVariantUsage(productId: string) {
    const variants = await this.client.productVariant.findMany({
      where: { productId },
      select: {
        id: true,
        _count: {
          select: {
            cartItems: true,
            orderItems: true,
            inventoryMovements: true,
            inventoryReservations: true,
          },
        },
        inventoryLevel: { select: { variantId: true } },
      },
    });
    return variants.map(({ id, _count, inventoryLevel }) => ({
      id,
      inUse:
        _count.cartItems > 0 ||
        _count.orderItems > 0 ||
        _count.inventoryMovements > 0 ||
        _count.inventoryReservations > 0 ||
        inventoryLevel !== null,
    }));
  }

  async createProduct(id: string, fields: ProductFields): Promise<void> {
    await this.client.product.create({ data: { id, ...fields } });
  }

  // Only matches the revision the admin loaded. `updatedAt` is bumped by hand
  // so two saves in the same millisecond still get different revisions.
  async updateProduct(
    id: string,
    expectedUpdatedAt: Date,
    data: Partial<ProductFields> & {
      status?: ProductDetail["status"];
      publishedAt?: Date | null;
      archivedAt?: Date | null;
    },
  ): Promise<boolean> {
    const result = await this.client.product.updateMany({
      where: { id, updatedAt: expectedUpdatedAt },
      data: { ...data, updatedAt: nextUpdatedAt(expectedUpdatedAt) },
    });
    return result.count === 1;
  }

  async replaceLinks(productId: string, links: ProductLinks): Promise<void> {
    await this.client.productAttributeOption.deleteMany({
      where: { productId },
    });
    await this.client.productAttribute.deleteMany({ where: { productId } });
    await this.client.productTagLink.deleteMany({ where: { productId } });
    await this.client.categoryProduct.deleteMany({ where: { productId } });

    await this.client.categoryProduct.createMany({
      data: links.categoryIds.map((categoryId, sortOrder) => ({
        productId,
        categoryId,
        sortOrder,
      })),
    });
    await this.client.productTagLink.createMany({
      data: links.tagIds.map((tagId) => ({ productId, tagId })),
    });
    await this.client.productAttribute.createMany({
      data: links.attributes.map(
        ({ attributeId, useForVariants }, sortOrder) => ({
          productId,
          attributeId,
          sortOrder,
          useForVariants,
        }),
      ),
    });
    await this.client.productAttributeOption.createMany({
      data: links.attributes.flatMap(({ attributeId, optionIds }) =>
        optionIds.map((attributeOptionId) => ({
          productId,
          attributeId,
          attributeOptionId,
        })),
      ),
    });
  }

  // Existing variants need one update each. New variants and every option
  // link are written in single batch queries to keep the transaction short.
  async saveVariants(
    productId: string,
    variants: ProductVariantInput[],
  ): Promise<void> {
    const rows = variants.map((variant) => ({
      id: variant.id ?? randomUUID(),
      isNew: !variant.id,
      data: toVariantData(variant),
      attributeOptions: variant.attributeOptions,
    }));

    for (const row of rows) {
      if (row.isNew) continue;
      await this.client.productVariant.update({
        where: { id: row.id },
        data: row.data,
      });
    }
    await this.client.productVariant.createMany({
      data: rows
        .filter((row) => row.isNew)
        .map((row) => ({ ...row.data, id: row.id, productId })),
    });

    await this.client.variantAttributeOption.deleteMany({
      where: { variantId: { in: rows.map((row) => row.id) } },
    });
    await this.client.variantAttributeOption.createMany({
      data: rows.flatMap((row) =>
        row.attributeOptions.map(({ attributeId, attributeOptionId }) => ({
          productId,
          variantId: row.id,
          attributeId,
          attributeOptionId,
        })),
      ),
    });
  }

  async archiveVariants(productId: string, ids: string[]): Promise<void> {
    await this.client.productVariant.updateMany({
      where: { id: { in: ids }, productId },
      data: { status: "archived", archivedAt: new Date(), isDefault: false },
    });
  }

  async deleteVariants(productId: string, ids: string[]): Promise<void> {
    await this.client.variantAttributeOption.deleteMany({
      where: { variantId: { in: ids } },
    });
    await this.client.productVariant.deleteMany({
      where: { id: { in: ids }, productId },
    });
  }
}
