import { adminRouter } from "@/features/admin/router";
import { authRouter } from "@/features/auth/router";
import { mediaRouter } from "@/features/catalog/media/router";
import { productsRouter } from "@/features/catalog/products/router";
import { taxonomyRouter } from "@/features/catalog/taxonomy/router";
import { customersRouter } from "@/features/customers/router";
import { fulfilmentsRouter } from "@/features/fulfilments/router";
import { healthRouter } from "@/features/health/router";
import { inventoryRouter } from "@/features/inventory/router";
import { ordersRouter } from "@/features/orders/router";
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
};
