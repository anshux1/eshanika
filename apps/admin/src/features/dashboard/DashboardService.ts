import { db } from "@eshanika/database/db";
import type { AdminRole } from "@eshanika/database/enums";
import { hasPermission } from "@/orpc/permissions";

const PROCESSING = ["created", "confirmed", "processing"] as const;

// Today and the six days before it, in India time.
async function sales() {
  const [row] = await db.$queryRaw<
    {
      todayOrders: number;
      todaySales: string;
      weekOrders: number;
      weekSales: string;
    }[]
  >`
    WITH placed AS (
      SELECT (COALESCE("placedAt", "createdAt") AT TIME ZONE 'Asia/Kolkata')::date AS day,
             "totalAmount" AS total
      FROM "Order"
      WHERE status <> 'cancelled'
        AND COALESCE("placedAt", "createdAt") >=
            (((now() AT TIME ZONE 'Asia/Kolkata')::date - 6)::timestamp AT TIME ZONE 'Asia/Kolkata')
    )
    SELECT
      count(*) FILTER (WHERE day = (now() AT TIME ZONE 'Asia/Kolkata')::date)::int AS "todayOrders",
      COALESCE(sum(total) FILTER (WHERE day = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0)::text AS "todaySales",
      count(*)::int AS "weekOrders",
      COALESCE(sum(total), 0)::text AS "weekSales"
    FROM placed`;
  return (
    row ?? { todayOrders: 0, todaySales: "0", weekOrders: 0, weekSales: "0" }
  );
}

async function ordersToProcess() {
  const groups = await db.order.groupBy({
    by: ["status"],
    where: { status: { in: [...PROCESSING] } },
    _count: { _all: true },
  });
  const count = (status: (typeof PROCESSING)[number]) =>
    groups.find((group) => group.status === status)?._count._all ?? 0;
  return {
    created: count("created"),
    confirmed: count("confirmed"),
    processing: count("processing"),
  };
}

// Same rule as the stock list: low means some left but at or under the reorder point.
async function stock() {
  const [row] = await db.$queryRaw<{ low: number; out: number }[]>`
    SELECT
      count(*) FILTER (
        WHERE COALESCE(l."quantityOnHand", 0) - COALESCE(l."quantityReserved", 0) > 0
          AND COALESCE(l."quantityOnHand", 0) - COALESCE(l."quantityReserved", 0) <= COALESCE(l."reorderPoint", 0)
      )::int AS low,
      count(*) FILTER (
        WHERE COALESCE(l."quantityOnHand", 0) - COALESCE(l."quantityReserved", 0) <= 0
      )::int AS out
    FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    LEFT JOIN "InventoryLevel" l ON l."variantId" = v.id
    WHERE v."manageStock" AND v."archivedAt" IS NULL AND p."archivedAt" IS NULL`;
  return row ?? { low: 0, out: 0 };
}

async function payments() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [failedPayments, pendingRefunds, failedEvents] = await Promise.all([
    db.payment.count({
      where: { status: "failed", createdAt: { gte: weekAgo } },
    }),
    db.refund.count({ where: { status: "pending" } }),
    db.paymentEvent.count({ where: { processingStatus: "failed" } }),
  ]);
  return { failedPayments, pendingRefunds, failedEvents };
}

export class DashboardService {
  // Each admin only gets the figures their role can already see elsewhere.
  async summary(role: AdminRole) {
    const canOrders = hasPermission(role, "orders.read");
    const canStock = hasPermission(role, "inventory.write");
    const canPayments = hasPermission(role, "payments.read");
    const [salesSummary, toProcess, stockSummary, paymentSummary] =
      await Promise.all([
        canOrders ? sales() : null,
        canOrders ? ordersToProcess() : null,
        canStock ? stock() : null,
        canPayments ? payments() : null,
      ]);
    return {
      sales: salesSummary,
      ordersToProcess: toProcess,
      stock: stockSummary,
      payments: paymentSummary,
    };
  }
}
export const dashboardService = new DashboardService();
