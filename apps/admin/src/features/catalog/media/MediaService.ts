import { toPage } from "@eshanika/orpc/pagination";
import { imageSize } from "image-size";
import { AdminError } from "@/lib/admin-error";
import {
  getImageReadUrl,
  getUploadedImage,
  getUploadedImageStart,
} from "@/lib/idrive-e2";
import type { AdminActor } from "@/orpc/audit";
import {
  type MediaRecord,
  PrismaMediaRepository,
} from "./PrismaMediaRepository";
import type {
  ArchiveMediaInput,
  CreateMediaInput,
  ListMediaInput,
  SetProductMediaInput,
  UpdateAltInput,
} from "./schema";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const maxFileSize = 10 * 1024 * 1024;
// Image headers, including large EXIF blocks, fit well inside this.
const headerBytes = 512 * 1024;

// Rules here compare an image with the products using it, so these writes run
// serializable to stop a publish and an image edit from slipping past each other.
const SERIALIZABLE = { isolationLevel: "Serializable" as const };

function hasImageSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    );
  }
  const decoder = new TextDecoder();
  if (mimeType === "image/webp") {
    return (
      decoder.decode(bytes.slice(0, 4)) === "RIFF" &&
      decoder.decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "image/avif") {
    const box = decoder.decode(bytes.slice(4, 12));
    return box === "ftypavif" || box === "ftypavis";
  }
  return false;
}

function readDimensions(bytes: Uint8Array) {
  try {
    const { width, height } = imageSize(bytes);
    if (width && height) return { width, height };
  } catch {
    // Handled below with a clear message.
  }
  throw new AdminError("BAD_REQUEST", "Image dimensions could not be read.");
}

async function present(asset: MediaRecord) {
  return {
    ...asset,
    fileSizeBytes: asset.fileSizeBytes.toString(),
    readUrl: await getImageReadUrl(asset.storageKey),
  };
}

function assertEditable(
  asset: MediaRecord | null,
  expectedUpdatedAt: Date,
): MediaRecord {
  if (!asset) throw new AdminError("NOT_FOUND", "Image not found.");
  if (asset.status !== "active") {
    throw new AdminError("CONFLICT", "Archived images cannot be changed.");
  }
  if (asset.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new AdminError("CONFLICT", "Image changed. Reload and try again.");
  }
  return asset;
}

export class MediaService {
  constructor(private readonly repository: PrismaMediaRepository) {}

  async list(input: ListMediaInput) {
    const rows = await this.repository.list(input);
    const page = toPage(rows, input.limit, (row) => row.id);
    return { ...page, items: await Promise.all(page.items.map(present)) };
  }

  async get(id: string) {
    const asset = await this.repository.find(id);
    if (!asset) throw new AdminError("NOT_FOUND", "Image not found.");
    return present(asset);
  }

  async getProductMedia(productId: string) {
    const product = await this.repository.findProductMedia(productId);
    if (!product) throw new AdminError("NOT_FOUND", "Product not found.");
    const items = await Promise.all(
      product.productMedia.map(async ({ mediaAsset, role, sortOrder }) => ({
        ...mediaAsset,
        role,
        sortOrder,
        readUrl: await getImageReadUrl(mediaAsset.storageKey),
      })),
    );
    return {
      id: product.id,
      status: product.status,
      updatedAt: product.updatedAt,
      items,
    };
  }

  // The browser uploads straight to storage, so the file is checked here
  // before it becomes a library image.
  async create(input: CreateMediaInput, actor: AdminActor) {
    let uploaded: Awaited<ReturnType<typeof getUploadedImage>>;
    try {
      uploaded = await getUploadedImage(input.storageKey);
    } catch {
      throw new AdminError("BAD_REQUEST", "Uploaded image could not be found.");
    }
    if (!allowedMimeTypes.has(uploaded.contentType)) {
      throw new AdminError("BAD_REQUEST", "Unsupported image type.");
    }
    if (uploaded.contentLength < 1 || uploaded.contentLength > maxFileSize) {
      throw new AdminError("BAD_REQUEST", "Image must be at most 10 MB.");
    }
    const bytes = await getUploadedImageStart(input.storageKey, headerBytes);
    if (!hasImageSignature(uploaded.contentType, bytes)) {
      throw new AdminError(
        "BAD_REQUEST",
        "File content is not a supported image.",
      );
    }
    const dimensions = readDimensions(bytes);

    const asset = await this.repository.transaction(async (repository) => {
      const created = await repository.create({
        storageKey: input.storageKey,
        originalFileName: input.originalFileName,
        mimeType: uploaded.contentType,
        fileSizeBytes: BigInt(uploaded.contentLength),
        ...dimensions,
      });
      await repository.writeAudit(actor, {
        action: "media.create",
        entityType: "MediaAsset",
        entityId: created.id,
      });
      return created;
    });
    return present(asset);
  }

  async updateAlt(input: UpdateAltInput, actor: AdminActor) {
    const asset = await this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.find(input.id),
        input.updatedAt,
      );
      const isLivePrimary = current.productMedia.some(
        ({ role, product }) =>
          role === "primary" && product.status === "active",
      );
      if (!input.altText && isLivePrimary) {
        throw new AdminError(
          "CONFLICT",
          "Primary images on active products need alt text.",
        );
      }
      const saved = await repository.update(current.id, current.updatedAt, {
        altText: input.altText,
      });
      if (!saved) {
        throw new AdminError(
          "CONFLICT",
          "Image changed. Reload and try again.",
        );
      }
      await repository.writeAudit(actor, {
        action: "media.update-alt",
        entityType: "MediaAsset",
        entityId: current.id,
      });
      return repository.find(current.id);
    }, SERIALIZABLE);
    if (!asset) throw new AdminError("NOT_FOUND", "Image not found.");
    return present(asset);
  }

  async archive(input: ArchiveMediaInput, actor: AdminActor) {
    const asset = await this.repository.transaction(async (repository) => {
      const current = assertEditable(
        await repository.find(input.id),
        input.updatedAt,
      );
      if (
        current.productMedia.some(({ product }) => product.status === "active")
      ) {
        throw new AdminError("CONFLICT", "Image is used by an active product.");
      }
      const saved = await repository.update(current.id, current.updatedAt, {
        status: "archived",
      });
      if (!saved) {
        throw new AdminError(
          "CONFLICT",
          "Image changed. Reload and try again.",
        );
      }
      await repository.writeAudit(actor, {
        action: "media.archive",
        entityType: "MediaAsset",
        entityId: current.id,
      });
      return repository.find(current.id);
    }, SERIALIZABLE);
    if (!asset) throw new AdminError("NOT_FOUND", "Image not found.");
    return present(asset);
  }

  setProductMedia(input: SetProductMediaInput, actor: AdminActor) {
    const { productId, mediaIds, primaryId } = input;
    if (new Set(mediaIds).size !== mediaIds.length) {
      throw new AdminError("BAD_REQUEST", "Each image may appear only once.");
    }
    if (mediaIds.length > 0 && (!primaryId || !mediaIds.includes(primaryId))) {
      throw new AdminError("BAD_REQUEST", "Choose one primary image.");
    }
    if (mediaIds.length === 0 && primaryId) {
      throw new AdminError(
        "BAD_REQUEST",
        "Primary image must be in the image list.",
      );
    }

    return this.repository.transaction(async (repository) => {
      const product = await repository.findProductMedia(productId);
      if (!product) throw new AdminError("NOT_FOUND", "Product not found.");
      if (product.status === "archived") {
        throw new AdminError("CONFLICT", "Archived products cannot be edited.");
      }
      if (product.updatedAt.getTime() !== input.updatedAt.getTime()) {
        throw new AdminError(
          "CONFLICT",
          "Product changed. Reload and try again.",
        );
      }
      const assets = await repository.findActiveAssets(mediaIds);
      if (assets.length !== mediaIds.length) {
        throw new AdminError("BAD_REQUEST", "Choose active images only.");
      }
      if (product.status === "active") {
        const primary = assets.find((asset) => asset.id === primaryId);
        if (!primary) {
          throw new AdminError(
            "BAD_REQUEST",
            "Active products need a primary image.",
          );
        }
        if (!primary.altText?.trim()) {
          throw new AdminError("BAD_REQUEST", "Primary image needs alt text.");
        }
      }

      if (!(await repository.touchProduct(productId, product.updatedAt))) {
        throw new AdminError(
          "CONFLICT",
          "Product changed. Reload and try again.",
        );
      }
      await repository.replaceProductMedia(productId, mediaIds, primaryId);
      await repository.writeAudit(actor, {
        action: "product.media.set",
        entityType: "Product",
        entityId: productId,
        beforeData: {
          mediaIds: product.productMedia.map(({ mediaAsset }) => mediaAsset.id),
        },
        afterData: { mediaIds, primaryId },
      });

      const updated = await repository.findProductMedia(productId);
      if (!updated) throw new AdminError("NOT_FOUND", "Product not found.");
      return {
        id: updated.id,
        updatedAt: updated.updatedAt,
        productMedia: updated.productMedia.map(
          ({ mediaAsset, role, sortOrder }) => ({
            mediaAssetId: mediaAsset.id,
            role,
            sortOrder,
          }),
        ),
      };
    }, SERIALIZABLE);
  }
}

export const mediaService = new MediaService(new PrismaMediaRepository());
