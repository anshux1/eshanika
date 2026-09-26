import { db } from "@eshanika/database/db";
import { publicProcedure } from "@eshanika/orpc/base";
import { z } from "zod";

export const healthRouter = {
  ping: publicProcedure
    .output(z.object({ status: z.literal("ok"), checkedAt: z.iso.datetime() }))
    .handler(async () => {
      await db.$queryRaw`select 1`;
      return { status: "ok" as const, checkedAt: new Date().toISOString() };
    }),
};
