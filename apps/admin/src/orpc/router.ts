import { adminRouter } from "@/features/admin/router";
import { authRouter } from "@/features/auth/router";
import { mediaRouter } from "@/features/catalog/media/router";
import { productsRouter } from "@/features/catalog/products/router";
import { taxonomyRouter } from "@/features/catalog/taxonomy/router";
import { couponsRouter } from "@/features/coupons/router";
import { customersRouter } from "@/features/customers/router";
import { feesRouter } from "@/features/fees/router";
import { fulfilmentsRouter } from "@/features/fulfilments/router";
import { healthRouter } from "@/features/health/router";
import { inventoryRouter } from "@/features/inventory/router";
import { ordersRouter } from "@/features/orders/router";
import { paymentsRouter, refundsRouter } from "@/features/payments/router";
import { returnsRouter } from "@/features/returns/router";
import { shippingRouter } from "@/features/shipping/router";
import { teamRouter } from "@/features/team/router";

export const router = {
  auth: authRouter,
  admin: adminRouter,
  catalog: {
    ...taxonomyRouter,
    products: productsRouter,
    media: mediaRouter,
  },
  health: healthRouter,
  team: teamRouter,
  inventory: inventoryRouter,
  customers: customersRouter,
  orders: ordersRouter,
  fulfilments: fulfilmentsRouter,
  returns: returnsRouter,
  payments: paymentsRouter,
  refunds: refundsRouter,
  coupons: couponsRouter,
  shipping: shippingRouter,
  fees: feesRouter,
};
