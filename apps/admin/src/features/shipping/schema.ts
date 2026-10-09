import {
  ShippingMethodKind,
  ShippingRequirement,
} from "@eshanika/database/enums";
import { z } from "zod";
import { INDIAN_STATES } from "./indian-states";

const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 499 or 499.50");
const version = { id, expectedUpdatedAt: timestamp };

const zoneFields = z.object({
  name: z.string().trim().min(1).max(120),
  states: z.array(z.enum(INDIAN_STATES)).max(INDIAN_STATES.length),
});
const methodFields = z.object({
  kind: z.enum(ShippingMethodKind),
  title: z.string().trim().min(1).max(120),
  cost: money,
  requirement: z.enum(ShippingRequirement),
  minimumSubtotal: money.nullable(),
  ignoreDiscounts: z.boolean(),
  taxable: z.boolean(),
});
const move = z.object({ ...version, direction: z.enum(["up", "down"]) });

export const shippingSchemas = {
  createZone: zoneFields,
  updateZone: zoneFields.extend({ ...version, enabled: z.boolean() }),
  moveZone: move,
  deleteZone: z.object(version),
  createMethod: methodFields.extend({ zoneId: id }),
  updateMethod: methodFields.extend({ ...version, enabled: z.boolean() }),
  moveMethod: move,
  deleteMethod: z.object(version),
  quote: z.object({
    subtotal: money,
    discount: money.default("0"),
    state: z.enum(INDIAN_STATES),
    couponCode: z.string().trim().toUpperCase().min(1).max(40).optional(),
  }),
};
export type ZoneFields = z.infer<typeof zoneFields>;
export type ZoneUpdateInput = z.infer<typeof shippingSchemas.updateZone>;
export type MoveInput = z.infer<typeof move>;
export type VersionInput = z.infer<typeof shippingSchemas.deleteZone>;
export type MethodFields = z.infer<typeof methodFields>;
export type MethodCreateInput = z.infer<typeof shippingSchemas.createMethod>;
export type MethodUpdateInput = z.infer<typeof shippingSchemas.updateMethod>;
export type QuoteInput = z.infer<typeof shippingSchemas.quote>;
