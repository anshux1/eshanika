import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 49 or 49.50");
const feeFields = z.object({
  name: z.string().trim().min(1).max(120),
  amount: money,
  taxable: z.boolean(),
});

export const feeSchemas = {
  createCod: feeFields,
  updateCod: feeFields.extend({
    id: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    enabled: z.boolean(),
  }),
};
export type FeeFields = z.infer<typeof feeFields>;
export type CodFeeUpdateInput = z.infer<typeof feeSchemas.updateCod>;
