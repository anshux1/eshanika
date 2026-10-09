import { adminProcedure } from "@/orpc/procedures";
import { reportService } from "./ReportService";
import { reportSchemas } from "./schema";

const reports = adminProcedure("reports.read");

export const reportsRouter = {
  sales: reports
    .input(reportSchemas.sales)
    .handler(({ input }) => reportService.sales(input)),
  abandonedCarts: reports
    .input(reportSchemas.carts)
    .handler(({ input }) => reportService.abandonedCarts(input)),
};
