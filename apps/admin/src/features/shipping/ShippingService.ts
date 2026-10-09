import { AdminError } from "@/lib/admin-error";
import { rupeesToPaise } from "@/lib/money";
import type { AdminActor } from "@/orpc/audit";
import { shippingRepository } from "./PrismaShippingRepository";
import type {
  MethodCreateInput,
  MethodFields,
  MethodUpdateInput,
  MoveInput,
  QuoteInput,
  VersionInput,
  ZoneFields,
  ZoneUpdateInput,
} from "./schema";

// Drops values that don't apply to the chosen kind and requirement, so stored rows stay unambiguous.
function normalizeMethod<T extends MethodFields>(input: T): T {
  const minimum = input.requirement === "minimum_subtotal";
  if (
    minimum &&
    (!input.minimumSubtotal || rupeesToPaise(input.minimumSubtotal) <= 0)
  )
    throw new AdminError(
      "BAD_REQUEST",
      "Enter the minimum cart value for this method.",
    );
  return {
    ...input,
    cost: input.kind === "free_shipping" ? "0" : input.cost,
    minimumSubtotal: minimum ? input.minimumSubtotal : null,
    ignoreDiscounts: minimum ? input.ignoreDiscounts : false,
  };
}

function uniqueStates<T extends ZoneFields>(input: T): T {
  return { ...input, states: [...new Set(input.states)].sort() };
}

export class ShippingService {
  listZones() {
    return shippingRepository.listZones();
  }
  createZone(input: ZoneFields, actor: AdminActor) {
    return shippingRepository.createZone(uniqueStates(input), actor);
  }
  updateZone(input: ZoneUpdateInput, actor: AdminActor) {
    return shippingRepository.updateZone(uniqueStates(input), actor);
  }
  moveZone(input: MoveInput, actor: AdminActor) {
    return shippingRepository.moveZone(input, actor);
  }
  deleteZone(input: VersionInput, actor: AdminActor) {
    return shippingRepository.deleteZone(input, actor);
  }
  createMethod(input: MethodCreateInput, actor: AdminActor) {
    return shippingRepository.createMethod(normalizeMethod(input), actor);
  }
  updateMethod(input: MethodUpdateInput, actor: AdminActor) {
    return shippingRepository.updateMethod(normalizeMethod(input), actor);
  }
  moveMethod(input: MoveInput, actor: AdminActor) {
    return shippingRepository.moveMethod(input, actor);
  }
  deleteMethod(input: VersionInput, actor: AdminActor) {
    return shippingRepository.deleteMethod(input, actor);
  }

  // Checkout will call this too. It reads live settings, so changes never touch placed orders.
  async quote(input: QuoteInput) {
    const zone = await shippingRepository.zoneForState(input.state);
    if (!zone) return { zone: null, methods: [] };
    const subtotal = rupeesToPaise(input.subtotal);
    const afterDiscount = Math.max(subtotal - rupeesToPaise(input.discount), 0);
    const freeShippingCoupon =
      input.couponCode &&
      zone.shippingMethods.some((method) => method.requirement === "coupon")
        ? await shippingRepository.hasFreeShippingCoupon(
            input.couponCode,
            new Date(),
          )
        : false;
    const methods = zone.shippingMethods.filter((method) => {
      if (method.requirement === "coupon") return freeShippingCoupon;
      if (method.requirement === "minimum_subtotal")
        return (
          (method.ignoreDiscounts ? subtotal : afterDiscount) >=
          rupeesToPaise(method.minimumSubtotal ?? "0")
        );
      return true;
    });
    return {
      zone: { id: zone.id, name: zone.name },
      methods: methods.map((method) => ({
        id: method.id,
        title: method.title,
        kind: method.kind,
        cost: method.cost,
        taxable: method.taxable,
      })),
    };
  }
}
export const shippingService = new ShippingService();
