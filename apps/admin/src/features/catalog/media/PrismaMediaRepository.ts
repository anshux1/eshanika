import { db, type Prisma } from "@eshanika/database/db";
import { type AdminActor, type AuditEntry, audit } from "@/orpc/audit";
import type { ListMediaInput } from "./schema";

const mediaSelect = {
  id: true,
  storageKey: true,
  originalFileName: true,
  mimeType: true,
  fileSizeBytes: true,
  width: true,
  height: true,
  altText: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  productMedia: {
    select: {
      product: { select: { id: true, name: true, status: true } },
      role: true,
      sortOrder: true,
    },
  },
} satisfies Prisma.MediaAssetSelect;

export type MediaRecord = Prisma.MediaAssetGetPayload<{
  select: typeof mediaSelect;
}>;

export class PrismaMediaRepository {
  constructor(private readonly client: Prisma.TransactionClient = db) {}

  transaction<T>(
    work: (repository: PrismaMediaRepository) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    return db.$transaction(
      (tx) => work(new PrismaMediaRepository(tx)),
      options,
    );
  }

  writeAudit(actor: AdminActor, entry: AuditEntry): Promise<void> {
    return audit(this.client, actor, entry);
  }

  list(input: ListMediaInput): Promise<MediaRecord[]> {
    return this.client.mediaAsset.findMany({
      where: input.search
        ? { originalFileName: { contains: input.search, mode: "insensitive" } }
        : undefined,
      select: mediaSelect,
      // IDs are random UUIDs, so they only break ties between equal timestamps.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
  }

  find(id: string): Promise<MediaRecord | null> {
    return this.client.mediaAsset.findUnique({
      where: { id },
      select: mediaSelect,
    });
  }

  create(data: {
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: bigint;
    width: number;
    height: number;
  }): Promise<MediaRecord> {
    return this.client.mediaAsset.create({ data, select: mediaSelect });
  }

  // Only matches the revision the admin loaded.
  async update(
    id: string,
    updatedAt: Date,
    data: Prisma.MediaAssetUpdateManyMutationInput,
  ): Promise<boolean> {
    const result = await this.client.mediaAsset.updateMany({
      where: { id, updatedAt },
      data,
    });
    return result.count === 1;
  }

  findActiveAssets(ids: string[]) {
    return this.client.mediaAsset.findMany({
      where: { id: { in: ids }, status: "active" },
      select: { id: true, altText: true },
    });
  }

  findProductMedia(productId: string) {
    return this.client.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        productMedia: {
          orderBy: { sortOrder: "asc" },
          select: {
            role: true,
            sortOrder: true,
            mediaAsset: {
              select: {
                id: true,
                storageKey: true,
                originalFileName: true,
                mimeType: true,
                width: true,
                height: true,
                altText: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  // Bumps the product revision so the image change counts as a product edit.
  async touchProduct(productId: string, updatedAt: Date): Promise<boolean> {
    const result = await this.client.product.updateMany({
      where: { id: productId, updatedAt },
      data: {
        updatedAt: new Date(Math.max(Date.now(), updatedAt.getTime() + 1)),
      },
    });
    return result.count === 1;
  }

  async replaceProductMedia(
    productId: string,
    mediaIds: string[],
    primaryId: string | null,
  ): Promise<void> {
    await this.client.productMedia.deleteMany({ where: { productId } });
    await this.client.productMedia.createMany({
      data: mediaIds.map((mediaAssetId, sortOrder) => ({
        productId,
        mediaAssetId,
        sortOrder,
        role: mediaAssetId === primaryId ? "primary" : "gallery",
      })),
    });
  }
}
