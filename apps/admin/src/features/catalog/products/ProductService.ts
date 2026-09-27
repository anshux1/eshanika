import { randomUUID } from "node:crypto";
import type { ProductStatus } from "@eshanika/database/enums";
import { AdminError } from "@/lib/admin-error";
import type { AdminActor, AuditEntry } from "@/orpc/audit";
import {
  PrismaProductRepository,
  type ProductFields,
  type ProductLinks,
} from "./PrismaProductRepository";
import type {
  ChangeProductStatusInput,
  CreateProductInput,
  GenerateVariantCombinationsInput,
  ListProductsInput,
  ProductAttributeInput,
  ProductVariantInput,
  UpdateProductInput,
} from "./schema";
import type { ProductDetail, PublishCheck } from "./types";

const MAX_VARIANT_COMBINATIONS = 256;

// A large variable product writes a few hundred rows in one save.
const SAVE_OPTIONS = { timeout: 20_000 };

// Publishing reads variant and image rows that other requests can change,
// so status changes run serializable.
const STATUS_OPTIONS = { isolationLevel: "Serializable" as const };

type VariantCombination = Array<{
  attributeId: string;
  attributeOptionId: string;
}>;

function badRequest(message: string): AdminError {
  return new AdminError("BAD_REQUEST", message);
}

function amountInMinorUnits(amount: string): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function combinationKey(options: VariantCombination): string {
  return options
    .map(
      ({ attributeId, attributeOptionId }) =>
        `${attributeId}:${attributeOptionId}`,
    )
    .sort()
    .join("|");
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function assertValidPrices(variants: ProductVariantInput[]): void {
  for (const variant of variants) {
    if (
      variant.salePrice !== null &&
      amountInMinorUnits(variant.salePrice) >=
        amountInMinorUnits(variant.regularPrice)
    ) {
      throw badRequest(
        `Sale price for ${variant.sku} must be lower than its regular price.`,
      );
    }
    if (
      variant.saleStartsAt &&
      variant.saleEndsAt &&
      Date.parse(variant.saleEndsAt) <= Date.parse(variant.saleStartsAt)
    ) {
      throw badRequest(
        `Sale end date for ${variant.sku} must be after its start date.`,
      );
    }
  }
}

function generateCombinations(
  attributes: Pick<ProductAttributeInput, "attributeId" | "optionIds">[],
): VariantCombination[] {
  if (attributes.length === 0) {
    throw badRequest("Choose at least one attribute for product variations.");
  }
  if (hasDuplicates(attributes.map(({ attributeId }) => attributeId))) {
    throw badRequest("Choose each variation attribute only once.");
  }

  let combinationCount = 1;
  for (const attribute of attributes) {
    if (hasDuplicates(attribute.optionIds)) {
      throw badRequest("Each variation attribute needs unique options.");
    }
    combinationCount *= attribute.optionIds.length;
    if (combinationCount > MAX_VARIANT_COMBINATIONS) {
      throw badRequest(
        `A product can have at most ${MAX_VARIANT_COMBINATIONS} variants.`,
      );
    }
  }

  let combinations: VariantCombination[] = [[]];
  for (const attribute of attributes) {
    const nextCombinations: VariantCombination[] = [];
    for (const combination of combinations) {
      for (const attributeOptionId of attribute.optionIds) {
        nextCombinations.push([
          ...combination,
          { attributeId: attribute.attributeId, attributeOptionId },
        ]);
      }
    }
    combinations = nextCombinations;
  }
  return combinations;
}

// Checks the form on its own, before any database read.
function assertValidForm(input: CreateProductInput | UpdateProductInput): void {
  if (hasDuplicates(input.categoryIds)) {
    throw badRequest("Choose each category only once.");
  }
  if (hasDuplicates(input.tagIds)) {
    throw badRequest("Choose each tag only once.");
  }
  if (hasDuplicates(input.attributes.map(({ attributeId }) => attributeId))) {
    throw badRequest("Choose each product attribute only once.");
  }
  for (const attribute of input.attributes) {
    if (hasDuplicates(attribute.optionIds)) {
      throw badRequest("Choose each attribute option only once.");
    }
  }
  const variantIds = input.variants.flatMap(({ id }) => (id ? [id] : []));
  if (hasDuplicates(variantIds)) {
    throw badRequest("Choose each variant only once.");
  }
  if (hasDuplicates(input.variants.map(({ sku }) => sku))) {
    throw badRequest("Each variant must have a unique SKU.");
  }
  assertValidPrices(input.variants);
  if (input.variants.filter(({ isDefault }) => isDefault).length > 1) {
    throw badRequest("Only one variant can be the default.");
  }

  const variationAttributes = input.attributes.filter(
    ({ useForVariants }) => useForVariants,
  );
  if (input.productType === "simple") {
    const [variant] = input.variants;
    if (input.variants.length !== 1 || !variant) {
      throw badRequest("A simple product must have exactly one variant.");
    }
    if (!variant.isDefault) {
      throw badRequest("The simple product variant must be the default.");
    }
    if (variant.attributeOptions.length > 0) {
      throw badRequest(
        "Simple product variants cannot have variation options.",
      );
    }
    if (variationAttributes.length > 0) {
      throw badRequest(
        "Choose a variable product type to use variation attributes.",
      );
    }
    return;
  }

  const expected = new Set(
    generateCombinations(variationAttributes).map(combinationKey),
  );
  const actual = new Set<string>();
  for (const variant of input.variants) {
    if (variant.attributeOptions.length !== variationAttributes.length) {
      throw badRequest(
        "Each variant must choose one option for every variation attribute.",
      );
    }
    if (
      hasDuplicates(
        variant.attributeOptions.map(({ attributeId }) => attributeId),
      )
    ) {
      throw badRequest(
        "Each variant can have one option per variation attribute.",
      );
    }
    const key = combinationKey(variant.attributeOptions);
    if (!expected.has(key)) {
      throw badRequest(
        "A variant uses an option that is not selected for this product.",
      );
    }
    if (actual.has(key)) {
      throw badRequest(
        "Each variation option combination can be used only once.",
      );
    }
    actual.add(key);
  }
  if (actual.size !== expected.size) {
    throw badRequest(
      "Add every option combination before saving this variable product.",
    );
  }
}

// Archived categories, attributes, and options may stay on a product that
// already uses them, but cannot be newly added.
async function assertSelectionsAvailable(
  repository: PrismaProductRepository,
  input: ProductLinks,
  productId?: string,
): Promise<void> {
  const linked = productId
    ? await repository.findLinkedIds(productId)
    : {
        categoryIds: new Set<string>(),
        attributeIds: new Set<string>(),
        optionIds: new Set<string>(),
      };

  const categories = await repository.findCategories(input.categoryIds);
  if (categories.length !== input.categoryIds.length) {
    throw badRequest("One or more selected categories are unavailable.");
  }
  for (const category of categories) {
    if (category.status !== "active" && !linked.categoryIds.has(category.id)) {
      throw badRequest(
        "Archived categories can remain on a product but cannot be newly selected.",
      );
    }
  }

  if ((await repository.countTags(input.tagIds)) !== input.tagIds.length) {
    throw badRequest("One or more selected tags are unavailable.");
  }

  const attributes = await repository.findAttributes(
    input.attributes.map(({ attributeId }) => attributeId),
  );
  const options = await repository.findOptions(
    input.attributes.flatMap(({ optionIds }) => optionIds),
  );
  const attributeStatus = new Map(
    attributes.map((row) => [row.id, row.status]),
  );
  const optionsById = new Map(options.map((row) => [row.id, row]));

  for (const attribute of input.attributes) {
    const status = attributeStatus.get(attribute.attributeId);
    if (!status) {
      throw badRequest("One or more selected attributes are unavailable.");
    }
    const wasLinked = linked.attributeIds.has(attribute.attributeId);
    if (status !== "active" && !wasLinked) {
      throw badRequest(
        "Archived attributes can remain on a product but cannot be newly selected.",
      );
    }
    for (const optionId of attribute.optionIds) {
      const option = optionsById.get(optionId);
      if (!option) {
        throw badRequest("One or more selected options are unavailable.");
      }
      if (option.attributeId !== attribute.attributeId) {
        throw badRequest("Each option must belong to its selected attribute.");
      }
      if (linked.optionIds.has(optionId)) continue;
      if (status !== "active") {
        throw badRequest("An archived attribute cannot accept new options.");
      }
      if (option.status !== "active") {
        throw badRequest(
          "Archived options can remain on a product but cannot be newly selected.",
        );
      }
    }
  }
}

function publishProblem(product: PublishCheck): string | null {
  const activeVariants = product.variants.filter(
    (variant) => variant.status === "active" && variant.archivedAt === null,
  );
  if (activeVariants.length === 0) {
    return "Add at least one active variant before publishing.";
  }
  if (activeVariants.filter(({ isDefault }) => isDefault).length !== 1) {
    return "Choose exactly one active default variant before publishing.";
  }
  const hasPrimaryImageWithAltText = product.primaryMedia.some(
    ({ altText, status }) => status === "active" && altText?.trim(),
  );
  if (!hasPrimaryImageWithAltText) {
    return "Add a primary product image with alt text before publishing.";
  }
  return null;
}

function canTransition(current: ProductStatus, next: ProductStatus): boolean {
  if (next === "archived") return current === "draft" || current === "active";
  if (current === "archived") return next === "draft";
  return current === "draft" && next === "active";
}

// Archiving keeps the original publish date so reports can still show it.
function statusDates(status: ProductStatus, now: Date) {
  if (status === "active") return { publishedAt: now, archivedAt: null };
  if (status === "draft") return { publishedAt: null, archivedAt: null };
  return { archivedAt: now };
}

function productFields(input: CreateProductInput): ProductFields {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    shortDescription: input.shortDescription,
    productType: input.productType,
    taxStatus: input.taxStatus,
    taxClass: input.taxClass,
  };
}

function auditSnapshot(
  product: ProductDetail,
): NonNullable<AuditEntry["afterData"]> {
  return {
    name: product.name,
    slug: product.slug,
    status: product.status,
    productType: product.productType,
    taxStatus: product.taxStatus,
    taxClass: product.taxClass,
    categoryIds: product.categories.map(({ id }) => id),
    tagIds: product.tags.map(({ id }) => id),
    attributes: product.attributes.map(({ id, useForVariants, options }) => ({
      attributeId: id,
      useForVariants,
      optionIds: options.map((option) => option.id),
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      regularPrice: variant.regularPrice,
      salePrice: variant.salePrice,
      isDefault: variant.isDefault,
      status: variant.status,
      optionIds: variant.attributeOptions.map(
        ({ attributeOptionId }) => attributeOptionId,
      ),
    })),
  };
}

function assertCurrent(
  product: ProductDetail | null,
  expectedUpdatedAt: string,
): ProductDetail {
  if (!product) throw new AdminError("NOT_FOUND", "Product not found.");
  if (product.updatedAt !== expectedUpdatedAt) {
    throw new AdminError(
      "CONFLICT",
      "This product changed in another tab. Reload it before saving.",
    );
  }
  return product;
}

function assertSaved(saved: boolean): void {
  if (!saved) {
    throw new AdminError(
      "CONFLICT",
      "This product changed in another tab. Reload it before saving.",
    );
  }
}

async function reload(
  repository: PrismaProductRepository,
  id: string,
): Promise<ProductDetail> {
  const product = await repository.findById(id);
  if (!product) throw new Error(`Product ${id} could not be reloaded`);
  return product;
}

export class ProductService {
  constructor(private readonly repository: PrismaProductRepository) {}

  list(input: ListProductsInput) {
    return this.repository.list(input);
  }

  async get(id: string): Promise<ProductDetail> {
    const product = await this.repository.findById(id);
    if (!product) throw new AdminError("NOT_FOUND", "Product not found.");
    return product;
  }

  create(input: CreateProductInput, actor: AdminActor) {
    if (input.variants.some(({ id }) => id !== undefined)) {
      throw badRequest("New products cannot reuse variant IDs.");
    }
    assertValidForm(input);

    return this.repository.transaction(async (repository) => {
      await assertSelectionsAvailable(repository, input);
      const productId = randomUUID();
      await repository.createProduct(productId, productFields(input));
      await repository.replaceLinks(productId, input);
      await repository.saveVariants(productId, input.variants);

      const product = await reload(repository, productId);
      await repository.writeAudit(actor, {
        action: "product.create",
        entityType: "Product",
        entityId: productId,
        afterData: auditSnapshot(product),
      });
      return product;
    }, SAVE_OPTIONS);
  }

  update(input: UpdateProductInput, actor: AdminActor) {
    assertValidForm(input);

    return this.repository.transaction(async (repository) => {
      const before = assertCurrent(
        await repository.findById(input.id),
        input.expectedUpdatedAt,
      );
      if (before.status === "archived") {
        throw new AdminError(
          "CONFLICT",
          "Restore this product to draft before editing it.",
        );
      }
      // A live product must still be publishable after the save. Images are
      // not part of this form, so the stored primary image is checked.
      if (before.status === "active") {
        const problem = publishProblem({
          variants: input.variants.map((variant) => ({
            status: "active",
            archivedAt: null,
            isDefault: variant.isDefault,
            regularPrice: variant.regularPrice,
          })),
          primaryMedia: before.primaryMedia,
        });
        if (problem) throw badRequest(problem);
      }

      const existingVariants = await repository.findVariantUsage(input.id);
      const existingIds = new Set(existingVariants.map(({ id }) => id));
      for (const variant of input.variants) {
        if (variant.id && !existingIds.has(variant.id)) {
          throw badRequest("A variant does not belong to this product.");
        }
      }
      await assertSelectionsAvailable(repository, input, input.id);

      assertSaved(
        await repository.updateProduct(
          input.id,
          new Date(input.expectedUpdatedAt),
          productFields(input),
        ),
      );
      await repository.replaceLinks(input.id, input);
      await repository.saveVariants(input.id, input.variants);

      // Variants left out of the form are removed. Ones with order or stock
      // history are archived instead, so that history keeps working.
      const keptIds = new Set(input.variants.map(({ id }) => id));
      const toArchive: string[] = [];
      const toDelete: string[] = [];
      for (const variant of existingVariants) {
        if (keptIds.has(variant.id)) continue;
        if (variant.inUse) toArchive.push(variant.id);
        else toDelete.push(variant.id);
      }
      await repository.archiveVariants(input.id, toArchive);
      await repository.deleteVariants(input.id, toDelete);

      const product = await reload(repository, input.id);
      await repository.writeAudit(actor, {
        action: "product.update",
        entityType: "Product",
        entityId: product.id,
        beforeData: auditSnapshot(before),
        afterData: auditSnapshot(product),
      });
      return product;
    }, SAVE_OPTIONS);
  }

  changeStatus(input: ChangeProductStatusInput, actor: AdminActor) {
    return this.repository.transaction(async (repository) => {
      const before = assertCurrent(
        await repository.findById(input.id),
        input.expectedUpdatedAt,
      );
      if (before.status === input.status) return before;
      if (!canTransition(before.status, input.status)) {
        throw badRequest(
          "Products can only move from draft to active, active to archived, or archived to draft.",
        );
      }
      if (input.status === "active") {
        const problem = publishProblem(before);
        if (problem) throw badRequest(problem);
      }

      assertSaved(
        await repository.updateProduct(
          input.id,
          new Date(input.expectedUpdatedAt),
          { status: input.status, ...statusDates(input.status, new Date()) },
        ),
      );
      const product = await reload(repository, input.id);
      await repository.writeAudit(actor, {
        action: `product.${input.status}`,
        entityType: "Product",
        entityId: input.id,
        beforeData: { status: before.status },
        afterData: { status: product.status },
      });
      return product;
    }, STATUS_OPTIONS);
  }

  bulkChangeStatus(
    ids: string[],
    status: "active" | "archived",
    actor: AdminActor,
  ) {
    return this.repository.transaction(async (repository) => {
      const products = await repository.findPublishStates(ids);
      if (products.length !== ids.length) {
        throw new AdminError(
          "NOT_FOUND",
          "One or more selected products could not be found.",
        );
      }
      if (status === "active") {
        for (const product of products) {
          if (product.status === "archived") {
            throw badRequest(
              "Restore archived products to draft before publishing them.",
            );
          }
          const problem = publishProblem(product);
          if (problem) throw badRequest(`${product.name}: ${problem}`);
        }
      }

      const now = new Date();
      const changing = products.filter((product) => product.status !== status);
      for (const product of changing) {
        const saved = await repository.updateProduct(
          product.id,
          product.updatedAt,
          { status, ...statusDates(status, now) },
        );
        if (!saved) {
          throw new AdminError(
            "CONFLICT",
            "One or more selected products changed. Reload the list and try again.",
          );
        }
        await repository.writeAudit(actor, {
          action:
            status === "active"
              ? "product.bulk_publish"
              : "product.bulk_archive",
          entityType: "Product",
          entityId: product.id,
          beforeData: { status: product.status },
          afterData: { status },
        });
      }
      return { ids, updatedCount: changing.length, status };
    }, STATUS_OPTIONS);
  }

  generateVariantCombinations(input: GenerateVariantCombinationsInput) {
    return generateCombinations(input.attributes);
  }
}

export const productService = new ProductService(new PrismaProductRepository());
