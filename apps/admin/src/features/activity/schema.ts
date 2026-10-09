import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

export const activitySchemas = {
  list: paginationInput.extend({
    cursor: z.uuid().optional(),
    actorUserId: z.string().min(1).max(128).optional(),
    entityType: z.string().trim().min(1).max(80).optional(),
    action: z.string().trim().min(1).max(80).optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  }),
};
export type ActivityListInput = z.infer<typeof activitySchemas.list>;
