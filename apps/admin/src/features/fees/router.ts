import { adminProcedure } from "@/orpc/procedures";
import { feeService } from "./FeeService";
import { feeSchemas } from "./schema";

const settings = adminProcedure("settings.write");

export const feesRouter = {
  cod: settings.handler(() => feeService.getCod()),
  createCod: settings
    .input(feeSchemas.createCod)
    .handler(({ input, context }) =>
      feeService.createCod(input, context.actor),
    ),
  updateCod: settings
    .input(feeSchemas.updateCod)
    .handler(({ input, context }) =>
      feeService.updateCod(input, context.actor),
    ),
};
