import { db, type Prisma } from "@eshanika/database/db";
import { AdminError } from "@/lib/admin-error";
import { retryWriteConflict } from "@/lib/retry-write-conflict";
import { type AdminActor, audit } from "@/orpc/audit";
import type {
  MethodCreateInput,
  MethodUpdateInput,
  MoveInput,
  VersionInput,
  ZoneFields,
  ZoneUpdateInput,
} from "./schema";

type Tx = Prisma.TransactionClient;

const SERIALIZABLE = { isolationLevel: "Serializable" } as const;

const methodSelect = {
  id: true,
  zoneId: true,
  kind: true,
  title: true,
  enabled: true,
  sortOrder: true,
  cost: true,
  requirement: true,
  minimumSubtotal: true,
  ignoreDiscounts: true,
  taxable: true,
  updatedAt: true,
} satisfies Prisma.ShippingMethodSelect;

const zoneSelect = {
  id: true,
  name: true,
  states: true,
  enabled: true,
  sortOrder: true,
  updatedAt: true,
  shippingMethods: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: methodSelect,
  },
} satisfies Prisma.ShippingZoneSelect;

type MethodRecord = Prisma.ShippingMethodGetPayload<{
  select: typeof methodSelect;
}>;
type ZoneRecord = Prisma.ShippingZoneGetPayload<{ select: typeof zoneSelect }>;

function toMethod(method: MethodRecord) {
  return {
    ...method,
    cost: method.cost.toString(),
    minimumSubtotal: method.minimumSubtotal?.toString() ?? null,
  };
}

function toZone(zone: ZoneRecord) {
  return { ...zone, shippingMethods: zone.shippingMethods.map(toMethod) };
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

// Each state belongs to one zone, and only one zone may cover "everywhere else".
async function assertStatesFree(tx: Tx, input: ZoneFields, exceptId?: string) {
  const others = await tx.shippingZone.findMany({
    where: exceptId ? { id: { not: exceptId } } : undefined,
    select: { name: true, states: true },
  });
  for (const other of others) {
    if (input.states.length === 0 && other.states.length === 0)
      throw new AdminError(
        "CONFLICT",
        `${other.name} already covers every other state. Pick states for this zone.`,
      );
    const clash = input.states.find((state) => other.states.includes(state));
    if (clash)
      throw new AdminError("CONFLICT", `${clash} is already in ${other.name}.`);
  }
}

// Swaps the record with its neighbour and renumbers the list so sort orders stay unique.
async function swapOrder(
  ids: string[],
  id: string,
  direction: "up" | "down",
  save: (id: string, sortOrder: number) => Promise<unknown>,
) {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return false;
  const next = [...ids];
  [next[index], next[target]] = [next[target] as string, next[index] as string];
  for (const [position, entry] of next.entries()) await save(entry, position);
  return true;
}

async function findZone(tx: Tx, id: string) {
  const zone = await tx.shippingZone.findUnique({
    where: { id },
    select: zoneSelect,
  });
  if (!zone) throw new AdminError("NOT_FOUND", "This zone was not found.");
  return toZone(zone);
}

export class PrismaShippingRepository {
  async listZones() {
    const zones = await db.shippingZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: zoneSelect,
    });
    return zones.map(toZone);
  }

  createZone(input: ZoneFields, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        await assertStatesFree(tx, input);
        const last = await tx.shippingZone.aggregate({
          _max: { sortOrder: true },
        });
        // New zones start disabled so checkout doesn't change until someone turns them on.
        const zone = await tx.shippingZone.create({
          data: {
            name: input.name,
            states: input.states,
            enabled: false,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
          },
          select: zoneSelect,
        });
        await audit(tx, actor, {
          action: "shipping.zone.create",
          entityType: "ShippingZone",
          entityId: zone.id,
          afterData: { name: zone.name, states: zone.states },
        });
        return toZone(zone);
      }, SERIALIZABLE),
    );
  }

  updateZone(input: ZoneUpdateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.shippingZone.findUnique({
          where: { id: input.id },
          select: { name: true, states: true, enabled: true, updatedAt: true },
        });
        assertCurrent(current, input.expectedUpdatedAt, "zone");
        await assertStatesFree(tx, input, input.id);
        const zone = await tx.shippingZone.update({
          where: { id: input.id },
          data: {
            name: input.name,
            states: input.states,
            enabled: input.enabled,
          },
          select: zoneSelect,
        });
        await audit(tx, actor, {
          action: "shipping.zone.update",
          entityType: "ShippingZone",
          entityId: zone.id,
          beforeData: {
            name: current?.name ?? "",
            states: current?.states ?? [],
            enabled: current?.enabled ?? false,
          },
          afterData: {
            name: zone.name,
            states: zone.states,
            enabled: zone.enabled,
          },
        });
        return toZone(zone);
      }, SERIALIZABLE),
    );
  }

  moveZone(input: MoveInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const zones = await tx.shippingZone.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, updatedAt: true },
        });
        assertCurrent(
          zones.find((zone) => zone.id === input.id) ?? null,
          input.expectedUpdatedAt,
          "zone",
        );
        const moved = await swapOrder(
          zones.map((zone) => zone.id),
          input.id,
          input.direction,
          (id, sortOrder) =>
            tx.shippingZone.update({ where: { id }, data: { sortOrder } }),
        );
        if (moved)
          await audit(tx, actor, {
            action: "shipping.zone.move",
            entityType: "ShippingZone",
            entityId: input.id,
            afterData: { direction: input.direction },
          });
        return findZone(tx, input.id);
      }, SERIALIZABLE),
    );
  }

  deleteZone(input: VersionInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.shippingZone.findUnique({
          where: { id: input.id },
          select: { name: true, updatedAt: true },
        });
        assertCurrent(current, input.expectedUpdatedAt, "zone");
        // Orders keep their own shipping snapshot, so nothing else points at a zone.
        await tx.shippingMethod.deleteMany({ where: { zoneId: input.id } });
        await tx.shippingZone.delete({ where: { id: input.id } });
        await audit(tx, actor, {
          action: "shipping.zone.delete",
          entityType: "ShippingZone",
          entityId: input.id,
          beforeData: { name: current?.name ?? "" },
        });
        return { id: input.id };
      }, SERIALIZABLE),
    );
  }

  createMethod(input: MethodCreateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const zone = await tx.shippingZone.findUnique({
          where: { id: input.zoneId },
          select: { id: true },
        });
        if (!zone)
          throw new AdminError("NOT_FOUND", "This zone was not found.");
        const last = await tx.shippingMethod.aggregate({
          where: { zoneId: input.zoneId },
          _max: { sortOrder: true },
        });
        const method = await tx.shippingMethod.create({
          data: {
            zoneId: input.zoneId,
            kind: input.kind,
            title: input.title,
            cost: input.cost,
            requirement: input.requirement,
            minimumSubtotal: input.minimumSubtotal,
            ignoreDiscounts: input.ignoreDiscounts,
            taxable: input.taxable,
            enabled: false,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
          },
          select: methodSelect,
        });
        await audit(tx, actor, {
          action: "shipping.method.create",
          entityType: "ShippingMethod",
          entityId: method.id,
          afterData: { zoneId: input.zoneId, title: method.title },
        });
        return toMethod(method);
      }, SERIALIZABLE),
    );
  }

  updateMethod(input: MethodUpdateInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.shippingMethod.findUnique({
          where: { id: input.id },
          select: methodSelect,
        });
        assertCurrent(current, input.expectedUpdatedAt, "shipping method");
        const method = await tx.shippingMethod.update({
          where: { id: input.id },
          data: {
            kind: input.kind,
            title: input.title,
            cost: input.cost,
            requirement: input.requirement,
            minimumSubtotal: input.minimumSubtotal,
            ignoreDiscounts: input.ignoreDiscounts,
            taxable: input.taxable,
            enabled: input.enabled,
          },
          select: methodSelect,
        });
        await audit(tx, actor, {
          action: "shipping.method.update",
          entityType: "ShippingMethod",
          entityId: method.id,
          beforeData: current
            ? { ...toMethod(current), updatedAt: undefined }
            : {},
          afterData: { ...toMethod(method), updatedAt: undefined },
        });
        return toMethod(method);
      }, SERIALIZABLE),
    );
  }

  moveMethod(input: MoveInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.shippingMethod.findUnique({
          where: { id: input.id },
          select: { zoneId: true, updatedAt: true },
        });
        assertCurrent(current, input.expectedUpdatedAt, "shipping method");
        const siblings = await tx.shippingMethod.findMany({
          where: { zoneId: current?.zoneId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        const moved = await swapOrder(
          siblings.map((method) => method.id),
          input.id,
          input.direction,
          (id, sortOrder) =>
            tx.shippingMethod.update({ where: { id }, data: { sortOrder } }),
        );
        if (moved)
          await audit(tx, actor, {
            action: "shipping.method.move",
            entityType: "ShippingMethod",
            entityId: input.id,
            afterData: { direction: input.direction },
          });
        return { id: input.id };
      }, SERIALIZABLE),
    );
  }

  deleteMethod(input: VersionInput, actor: AdminActor) {
    return retryWriteConflict(() =>
      db.$transaction(async (tx) => {
        const current = await tx.shippingMethod.findUnique({
          where: { id: input.id },
          select: { title: true, updatedAt: true },
        });
        assertCurrent(current, input.expectedUpdatedAt, "shipping method");
        await tx.shippingMethod.delete({ where: { id: input.id } });
        await audit(tx, actor, {
          action: "shipping.method.delete",
          entityType: "ShippingMethod",
          entityId: input.id,
          beforeData: { title: current?.title ?? "" },
        });
        return { id: input.id };
      }, SERIALIZABLE),
    );
  }

  // The first enabled zone listing the state wins; otherwise the "everywhere else" zone.
  async zoneForState(state: string) {
    const zones = await db.shippingZone.findMany({
      where: {
        enabled: true,
        OR: [{ states: { has: state } }, { states: { isEmpty: true } }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        ...zoneSelect,
        shippingMethods: {
          where: { enabled: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: methodSelect,
        },
      },
    });
    const zone =
      zones.find((entry) => entry.states.includes(state)) ??
      zones.find((entry) => entry.states.length === 0);
    return zone ? toZone(zone) : null;
  }

  async hasFreeShippingCoupon(code: string, now: Date) {
    const coupon = await db.coupon.findFirst({
      where: {
        code,
        archivedAt: null,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        couponShippingBenefit: { is: { freeShipping: true } },
      },
      select: { id: true },
    });
    return coupon !== null;
  }
}
export const shippingRepository = new PrismaShippingRepository();
