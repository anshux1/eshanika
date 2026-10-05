import { db, type Prisma } from "@eshanika/database/db";
import type { VariantStockStatus } from "@eshanika/database/enums";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  AdjustInput,
  InventoryListInput,
  MovementListInput,
} from "./schema";

const FILTER_BATCH_SIZE = 500;

type InventoryRow = {
  id: string;
  productId: string;
  productName: string;
  name: string;
  sku: string;
  stockStatus: VariantStockStatus;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
  available: number;
};

export class PrismaInventoryRepository {
  async list(input: InventoryListInput) {
    const variantSelect = {
      id: true,
      productId: true,
      name: true,
      sku: true,
      stockStatus: true,
      product: { select: { name: true } },
      inventoryLevel: {
        select: {
          quantityOnHand: true,
          quantityReserved: true,
          reorderPoint: true,
        },
      },
    } satisfies Prisma.ProductVariantSelect;
    const stockWhere: Prisma.ProductVariantWhereInput =
      input.stock === "out"
        ? {
            OR: [
              { inventoryLevel: { is: null } },
              {
                inventoryLevel: {
                  is: {
                    quantityOnHand: {
                      lte: db.inventoryLevel.fields.quantityReserved,
                    },
                  },
                },
              },
            ],
          }
        : input.stock === "low"
          ? {
              inventoryLevel: {
                is: {
                  quantityOnHand: {
                    gt: db.inventoryLevel.fields.quantityReserved,
                  },
                },
              },
            }
          : {};
    const matches: InventoryRow[] = [];
    const batchSize =
      input.stock === "low" ? FILTER_BATCH_SIZE : input.limit + 1;
    let scanCursor = input.cursor;

    while (matches.length <= input.limit) {
      const variants = await db.productVariant.findMany({
        where: {
          manageStock: true,
          archivedAt: null,
          product: { is: { archivedAt: null } },
          id: scanCursor ? { gt: scanCursor } : undefined,
          ...stockWhere,
        },
        orderBy: { id: "asc" },
        take: batchSize,
        select: variantSelect,
      });
      if (variants.length === 0) break;

      for (const variant of variants) {
        const quantityOnHand = variant.inventoryLevel?.quantityOnHand ?? 0;
        const quantityReserved = variant.inventoryLevel?.quantityReserved ?? 0;
        const reorderPoint = variant.inventoryLevel?.reorderPoint ?? 0;
        const available = quantityOnHand - quantityReserved;
        if (input.stock === "out" && available > 0) continue;
        if (
          input.stock === "low" &&
          (available <= 0 || available > reorderPoint)
        )
          continue;
        matches.push({
          id: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          name: variant.name,
          sku: variant.sku,
          stockStatus: variant.stockStatus,
          quantityOnHand,
          quantityReserved,
          reorderPoint,
          available,
        });
        if (matches.length > input.limit) break;
      }

      scanCursor = variants[variants.length - 1]?.id;
      if (variants.length < batchSize) break;
    }
    return toPage(matches, input.limit, (row) => row.id);
  }

  async movements(input: MovementListInput) {
    const rows = await db.inventoryMovement.findMany({
      where: {
        variantId: input.variantId,
        reason: input.reason,
        createdAt:
          input.from || input.to
            ? {
                gte: input.from ? new Date(input.from) : undefined,
                lte: input.to ? new Date(input.to) : undefined,
              }
            : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        variantId: true,
        quantityDelta: true,
        quantityAfter: true,
        reason: true,
        referenceType: true,
        referenceId: true,
        note: true,
        actorUserId: true,
        actorUser: { select: { id: true, name: true } },
        createdAt: true,
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
      },
    });
    return toPage(rows, input.limit, (row) => row.id);
  }

  async adjust(input: AdjustInput, actor: AdminActor) {
    // A retry lets a concurrent submit see the first committed movement by key.
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const previous = await tx.inventoryMovement.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            select: {
              id: true,
              variantId: true,
              quantityDelta: true,
              quantityAfter: true,
              reason: true,
              note: true,
            },
          });
          if (previous) {
            if (
              previous.variantId !== input.variantId ||
              previous.quantityDelta !== input.quantityDelta ||
              previous.reason !== input.reason ||
              (previous.note ?? "") !== (input.note ?? "")
            )
              throw new AdminError(
                "CONFLICT",
                "This adjustment key was already used for another change.",
              );
            return previous;
          }
          const variant = await tx.productVariant.findUnique({
            where: { id: input.variantId },
            select: { manageStock: true, archivedAt: true },
          });
          if (!variant?.manageStock || variant.archivedAt)
            throw new AdminError(
              "BAD_REQUEST",
              "Stock is not managed for this variant.",
            );
          const level = await tx.inventoryLevel.upsert({
            where: { variantId: input.variantId },
            create: { variantId: input.variantId },
            update: {},
            select: { quantityOnHand: true, quantityReserved: true },
          });
          const quantityAfter = level.quantityOnHand + input.quantityDelta;
          if (
            !Number.isSafeInteger(quantityAfter) ||
            quantityAfter < level.quantityReserved
          )
            throw new AdminError(
              "BAD_REQUEST",
              "Adjustment would put stock below the reserved quantity.",
            );
          await tx.inventoryLevel.update({
            where: { variantId: input.variantId },
            data: { quantityOnHand: quantityAfter },
          });
          await tx.productVariant.update({
            where: { id: input.variantId },
            data: {
              stockStatus:
                quantityAfter - level.quantityReserved > 0
                  ? "in_stock"
                  : "out_of_stock",
            },
          });
          const movement = await tx.inventoryMovement.create({
            data: {
              variantId: input.variantId,
              idempotencyKey: input.idempotencyKey,
              quantityDelta: input.quantityDelta,
              quantityAfter,
              reason: input.reason,
              note: input.note,
              actorUserId: actor.userId,
            },
            select: {
              id: true,
              variantId: true,
              quantityDelta: true,
              quantityAfter: true,
              reason: true,
              note: true,
            },
          });
          await audit(tx, actor, {
            action: "inventory.adjust",
            entityType: "InventoryMovement",
            entityId: movement.id,
            afterData: {
              variantId: input.variantId,
              quantityDelta: input.quantityDelta,
              quantityAfter,
              reason: input.reason,
            },
          });
          return movement;
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }
}
export const inventoryRepository = new PrismaInventoryRepository();
