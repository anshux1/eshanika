import { adminProcedure } from "@/orpc/procedures";
import { activityService } from "./ActivityService";
import { activitySchemas } from "./schema";

const auditRead = adminProcedure("audit.read");

export const activityRouter = {
  list: auditRead
    .input(activitySchemas.list)
    .handler(({ input }) => activityService.list(input)),
  filters: auditRead.handler(() => activityService.filters()),
};
