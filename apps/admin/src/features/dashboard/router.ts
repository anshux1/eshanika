import { adminProcedure } from "@/orpc/procedures";
import { dashboardService } from "./DashboardService";

export const dashboardRouter = {
  summary: adminProcedure().handler(({ context }) =>
    dashboardService.summary(context.admin.membershipRole),
  ),
};
