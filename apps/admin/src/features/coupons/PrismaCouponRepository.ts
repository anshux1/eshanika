import { db, type Prisma } from "@eshanika/database/db";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { rupeesToPaise } from "@/lib/money";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  CouponArchiveInput,
  CouponFields,
  CouponListInput,
  CouponRedemptionListInput,
  CouponUpdateInput,
} from "./schema";

const couponSelect = {
  id: true,
  code: true,
  kind: true,
  value: true,
  minimumSubtotal: true,
  maximumDiscount: true,
  usageLimit: true,
  perUserLimit: true,
  startsAt: true,
  expiresAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  couponShippingBenefit: { select: { freeShipping: true } },
  _count: { select: { couponRedemptions: true } },
} satisfies Prisma.CouponSelect;

type CouponRecord = Prisma.CouponGetPayload<{ select: typeof couponSelect }>;

function toCoupon({ _count, couponShippingBenefit, ...coupon }: CouponRecord) {
  return {
    ...coupon,
    value: coupon.value.toString(),
    minimumSubtotal: coupon.minimumSubtotal.toString(),
    maximumDiscount: coupon.maximumDiscount?.toString() ?? null,
    freeShipping: couponShippingBenefit?.freeShipping ?? false,
    redemptionCount: _count.couponRedemptions,
  };
}

function stateWhere(
  state: CouponListInput["state"],
  now: Date,
): Prisma.CouponWhereInput {
  if (state === "archived") return { archivedAt: { not: null } };
  if (state === "scheduled") return { archivedAt: null, startsAt: { gt: now } };
  if (state === "expired") return { archivedAt: null, expiresAt: { lte: now } };
  return {
    archivedAt: null,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

function couponData(input: CouponFields) {
  return {
    code: input.code,
    kind: input.kind,
    value: input.value,
    minimumSubtotal: input.minimumSubtotal,
    maximumDiscount: input.maximumDiscount,
    usageLimit: input.usageLimit,
    perUserLimit: input.perUserLimit,
    startsAt: new Date(input.startsAt),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  };
}

async function assertCodeFree(
  tx: Prisma.TransactionClient,
  code: string,
  exceptId?: string,
) {
  const taken = await tx.coupon.findUnique({
    where: { code },
    select: { id: true },
  });
  if (taken && taken.id !== exceptId)
    throw new AdminError("CONFLICT", "Another coupon already uses this code.");
}

async function findEditable(
  tx: Prisma.TransactionClient,
  id: string,
  expectedUpdatedAt: string,
) {
  const coupon = await tx.coupon.findUnique({
    where: { id },
    select: couponSelect,
  });
  if (!coupon) throw new AdminError("NOT_FOUND", "Coupon not found.");
  if (coupon.archivedAt)
    throw new AdminError(
      "CONFLICT",
      "This coupon is archived and can't be changed.",
    );
  if (coupon.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime())
    throw new AdminError(
      "CONFLICT",
      "This coupon changed. Reload it and try again.",
    );
  return coupon;
}

export class PrismaCouponRepository {
  async list(input: CouponListInput, now: Date) {
    const rows = await db.coupon.findMany({
      where: {
        ...stateWhere(input.state, now),
        code: input.search
          ? { contains: input.search.toUpperCase() }
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: couponSelect,
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return { items: page.items.map(toCoupon), nextCursor: page.nextCursor };
  }

  async get(id: string) {
    const coupon = await db.coupon.findUnique({
      where: { id },
      select: couponSelect,
    });
    return coupon ? toCoupon(coupon) : null;
  }

  async create(input: CouponFields, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          await assertCodeFree(tx, input.code);
          const coupon = await tx.coupon.create({
            data: {
              ...couponData(input),
              couponShippingBenefit: {
                create: { freeShipping: input.freeShipping },
              },
            },
            select: couponSelect,
          });
          await audit(tx, actor, {
            action: "coupons.create",
            entityType: "Coupon",
            entityId: coupon.id,
            afterData: { code: coupon.code },
          });
          return toCoupon(coupon);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async update(input: CouponUpdateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          const current = await findEditable(
            tx,
            input.id,
            input.expectedUpdatedAt,
          );
          if (input.code !== current.code)
            await assertCodeFree(tx, input.code, current.id);
          // Customers already got the old discount, so it stays fixed once used.
          if (
            current._count.couponRedemptions > 0 &&
            (input.kind !== current.kind ||
              rupeesToPaise(input.value) !==
                rupeesToPaise(current.value.toString()))
          )
            throw new AdminError(
              "CONFLICT",
              "This coupon has been used, so its type and value can't change.",
            );
          const coupon = await tx.coupon.update({
            where: { id: input.id },
            data: {
              ...couponData(input),
              couponShippingBenefit: {
                upsert: {
                  create: { freeShipping: input.freeShipping },
                  update: { freeShipping: input.freeShipping },
                },
              },
            },
            select: couponSelect,
          });
          await audit(tx, actor, {
            action: "coupons.update",
            entityType: "Coupon",
            entityId: coupon.id,
            beforeData: { code: current.code },
            afterData: { code: coupon.code },
          });
          return toCoupon(coupon);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async archive(input: CouponArchiveInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(
        async (tx) => {
          await findEditable(tx, input.id, input.expectedUpdatedAt);
          const coupon = await tx.coupon.update({
            where: { id: input.id },
            data: { archivedAt: new Date() },
            select: couponSelect,
          });
          await audit(tx, actor, {
            action: "coupons.archive",
            entityType: "Coupon",
            entityId: coupon.id,
            afterData: { code: coupon.code },
          });
          return toCoupon(coupon);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async redemptions(input: CouponRedemptionListInput) {
    const rows = await db.couponRedemption.findMany({
      where: { couponId: input.couponId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        discountAmount: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    return {
      items: page.items.map((row) => ({
        ...row,
        discountAmount: row.discountAmount.toString(),
      })),
      nextCursor: page.nextCursor,
    };
  }
}
export const couponRepository = new PrismaCouponRepository();
