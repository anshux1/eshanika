import { adminProcedure } from "@/orpc/procedures";
import { shippingService } from "./ShippingService";
import { shippingSchemas } from "./schema";

const settings = adminProcedure("settings.write");

export const shippingRouter = {
  zones: {
    list: settings.handler(() => shippingService.listZones()),
    create: settings
      .input(shippingSchemas.createZone)
      .handler(({ input, context }) =>
        shippingService.createZone(input, context.actor),
      ),
    update: settings
      .input(shippingSchemas.updateZone)
      .handler(({ input, context }) =>
        shippingService.updateZone(input, context.actor),
      ),
    move: settings
      .input(shippingSchemas.moveZone)
      .handler(({ input, context }) =>
        shippingService.moveZone(input, context.actor),
      ),
    delete: settings
      .input(shippingSchemas.deleteZone)
      .handler(({ input, context }) =>
        shippingService.deleteZone(input, context.actor),
      ),
  },
  methods: {
    create: settings
      .input(shippingSchemas.createMethod)
      .handler(({ input, context }) =>
        shippingService.createMethod(input, context.actor),
      ),
    update: settings
      .input(shippingSchemas.updateMethod)
      .handler(({ input, context }) =>
        shippingService.updateMethod(input, context.actor),
      ),
    move: settings
      .input(shippingSchemas.moveMethod)
      .handler(({ input, context }) =>
        shippingService.moveMethod(input, context.actor),
      ),
    delete: settings
      .input(shippingSchemas.deleteMethod)
      .handler(({ input, context }) =>
        shippingService.deleteMethod(input, context.actor),
      ),
  },
  quote: settings
    .input(shippingSchemas.quote)
    .handler(({ input }) => shippingService.quote(input)),
};
