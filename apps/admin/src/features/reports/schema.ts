import { paginationInput } from "@eshanika/orpc/pagination";
import { z } from "zod";

const day = z.iso.date();

export const MAX_REPORT_DAYS = 366;

export const reportSchemas = {
  sales: z.object({ from: day, to: day }),
  carts: paginationInput.extend({ cursor: z.uuid().optional() }),
};
export type SalesReportInput = z.infer<typeof reportSchemas.sales>;
export type CartListInput = z.infer<typeof reportSchemas.carts>;
