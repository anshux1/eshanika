import { db } from "@eshanika/database/db";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import type { ActivityListInput } from "./schema";

export class ActivityService {
  async list(input: ActivityListInput) {
    if (input.from && input.to && Date.parse(input.from) > Date.parse(input.to))
      throw new AdminError(
        "BAD_REQUEST",
        "Start date must be before end date.",
      );
    const rows = await db.adminAuditLog.findMany({
      where: {
        actorUserId: input.actorUserId,
        entityType: input.entityType,
        action: input.action
          ? { contains: input.action, mode: "insensitive" }
          : undefined,
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
      // IP address, user agent, and session stay on the server.
      select: {
        id: true,
        actorUserId: true,
        actorAdminRole: true,
        action: true,
        entityType: true,
        entityId: true,
        outcome: true,
        reason: true,
        beforeData: true,
        afterData: true,
        requestId: true,
        createdAt: true,
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    const actorIds = [
      ...new Set(
        page.items.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])),
      ),
    ];
    const actors = await db.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true },
    });
    const names = new Map(actors.map((actor) => [actor.id, actor.name]));
    return {
      items: page.items.map((row) => ({
        ...row,
        actorName: row.actorUserId
          ? (names.get(row.actorUserId) ?? null)
          : null,
      })),
      nextCursor: page.nextCursor,
    };
  }

  async filters() {
    const [actors, entityTypes] = await Promise.all([
      db.user.findMany({
        where: { adminMembership: { isNot: null } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.adminAuditLog.groupBy({
        by: ["entityType"],
        orderBy: { entityType: "asc" },
      }),
    ]);
    return { actors, entityTypes: entityTypes.map((row) => row.entityType) };
  }
}
export const activityService = new ActivityService();
