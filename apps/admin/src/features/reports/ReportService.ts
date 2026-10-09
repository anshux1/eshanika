import { db, type Prisma } from "@eshanika/database/db";
import { toPage } from "@eshanika/orpc/pagination";
import { AdminError } from "@/lib/admin-error";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import {
  type CartListInput,
  MAX_REPORT_DAYS,
  type SalesReportInput,
} from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

type DayRow = {
  day: string;
  orders: number;
  gross: string;
  discounts: string;
  shipping: string;
  fees: string;
  tax: string;
  total: string;
};

// Report days are whole India-time days. `to` is inclusive, so the window ends at the next midnight.
function window(input: SalesReportInput) {
  const from = new Date(`${input.from}T00:00:00+05:30`);
  const to = new Date(
    new Date(`${input.to}T00:00:00+05:30`).getTime() + DAY_MS,
  );
  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  if (days < 1)
    throw new AdminError(
      "BAD_REQUEST",
      "The start date must be on or before the end date.",
    );
  if (days > MAX_REPORT_DAYS)
    throw new AdminError("BAD_REQUEST", "Reports cover at most one year.");
  return { from, to };
}

const sum = (values: string[]) =>
  paiseToRupees(
    values.reduce((total, value) => total + rupeesToPaise(value), 0),
  );

// Effective price follows the same sale window rules as checkout.
function unitPrice(
  variant: {
    regularPrice: Prisma.Decimal;
    salePrice: Prisma.Decimal | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
  },
  now: Date,
) {
  const onSale =
    variant.salePrice !== null &&
    (!variant.saleStartsAt || variant.saleStartsAt <= now) &&
    (!variant.saleEndsAt || variant.saleEndsAt > now);
  return rupeesToPaise(
    (onSale ? variant.salePrice : variant.regularPrice)?.toString() ?? "0",
  );
}

export class ReportService {
  // Every figure comes from order snapshots. Cancelled orders are left out,
  // and refunds count on the day Razorpay processed them.
  async sales(input: SalesReportInput) {
    const { from, to } = window(input);
    const [days, refunds, topProducts, customers, coupons] = await Promise.all([
      db.$queryRaw<
        DayRow[]
      >`SELECT to_char((COALESCE(o."placedAt", o."createdAt") AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
                count(*)::int AS orders,
                sum(o."subtotalAmount")::text AS gross,
                sum(o."discountAmount")::text AS discounts,
                sum(o."shippingAmount")::text AS shipping,
                sum(o."feeAmount")::text AS fees,
                sum(o."taxAmount")::text AS tax,
                sum(o."totalAmount")::text AS total
         FROM "Order" o
         WHERE o.status <> 'cancelled' AND COALESCE(o."placedAt", o."createdAt") >= ${from} AND COALESCE(o."placedAt", o."createdAt") < ${to}
         GROUP BY 1 ORDER BY 1`,
      db.$queryRaw<{ day: string; amountMinor: string }[]>`
        SELECT to_char(("processedAt" AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
               sum("amountMinor")::text AS "amountMinor"
        FROM "Refund"
        WHERE status = 'processed' AND "processedAt" >= ${from} AND "processedAt" < ${to}
        GROUP BY 1 ORDER BY 1`,
      db.$queryRaw<
        { name: string; units: number; revenue: string }[]
      >`SELECT max(i."productNameSnapshot") AS name,
                sum(i.quantity)::int AS units,
                sum(i."totalAmount")::text AS revenue
         FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
         WHERE o.status <> 'cancelled' AND COALESCE(o."placedAt", o."createdAt") >= ${from} AND COALESCE(o."placedAt", o."createdAt") < ${to}
         GROUP BY COALESCE(i."productId"::text, i."productNameSnapshot")
         ORDER BY sum(i."totalAmount") DESC, sum(i.quantity) DESC
         LIMIT 10`,
      // New customers placed their first non-cancelled order inside the range.
      db.$queryRaw<
        { newCustomers: number; returningCustomers: number }[]
      >`WITH buyers AS (
           SELECT DISTINCT o."userId" FROM "Order" o
           WHERE o.status <> 'cancelled' AND COALESCE(o."placedAt", o."createdAt") >= ${from} AND COALESCE(o."placedAt", o."createdAt") < ${to}
         )
         SELECT
           count(*) FILTER (WHERE NOT earlier)::int AS "newCustomers",
           count(*) FILTER (WHERE earlier)::int AS "returningCustomers"
         FROM (
           SELECT EXISTS (
             SELECT 1 FROM "Order" p
             WHERE p."userId" = b."userId" AND p.status <> 'cancelled' AND COALESCE(p."placedAt", p."createdAt") < ${from}
           ) AS earlier
           FROM buyers b
         ) t`,
      db.$queryRaw<
        { code: string; uses: number; discount: string }[]
      >`SELECT c.code, count(*)::int AS uses, sum(r."discountAmount")::text AS discount
         FROM "CouponRedemption" r
         JOIN "Coupon" c ON c.id = r."couponId"
         JOIN "Order" o ON o.id = r."orderId"
         WHERE o.status <> 'cancelled' AND COALESCE(o."placedAt", o."createdAt") >= ${from} AND COALESCE(o."placedAt", o."createdAt") < ${to}
         GROUP BY c.code ORDER BY uses DESC, c.code`,
    ]);

    const refundsByDay = new Map(
      refunds.map((row) => [row.day, paiseToRupees(Number(row.amountMinor))]),
    );
    const allDays = [
      ...new Set([...days.map((row) => row.day), ...refundsByDay.keys()]),
    ].sort();
    const byDay = new Map(days.map((row) => [row.day, row]));
    const daily = allDays.map((day) => {
      const row = byDay.get(day);
      const gross = row?.gross ?? "0";
      const discounts = row?.discounts ?? "0";
      const refunded = refundsByDay.get(day) ?? "0";
      return {
        day,
        orders: row?.orders ?? 0,
        gross,
        discounts,
        refunds: refunded,
        net: paiseToRupees(
          rupeesToPaise(gross) -
            rupeesToPaise(discounts) -
            rupeesToPaise(refunded),
        ),
        shipping: row?.shipping ?? "0",
        fees: row?.fees ?? "0",
        tax: row?.tax ?? "0",
        total: row?.total ?? "0",
      };
    });
    const pick = (
      key:
        | "gross"
        | "discounts"
        | "refunds"
        | "net"
        | "shipping"
        | "fees"
        | "tax"
        | "total",
    ) => sum(daily.map((row) => row[key]));

    return {
      from: input.from,
      to: input.to,
      totals: {
        orders: daily.reduce((count, row) => count + row.orders, 0),
        gross: pick("gross"),
        discounts: pick("discounts"),
        refunds: pick("refunds"),
        net: pick("net"),
        shipping: pick("shipping"),
        fees: pick("fees"),
        tax: pick("tax"),
        total: pick("total"),
      },
      daily,
      topProducts,
      customers: customers[0] ?? { newCustomers: 0, returningCustomers: 0 },
      coupons,
    };
  }

  async abandonedCarts(input: CartListInput) {
    const rows = await db.cart.findMany({
      where: { status: "abandoned" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        cartItems: {
          orderBy: { createdAt: "asc" },
          select: {
            quantity: true,
            updatedAt: true,
            variant: {
              select: {
                name: true,
                sku: true,
                regularPrice: true,
                salePrice: true,
                saleStartsAt: true,
                saleEndsAt: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    const page = toPage(rows, input.limit, (row) => row.id);
    const now = new Date();
    return {
      items: page.items.map((cart) => ({
        id: cart.id,
        customer: cart.user,
        items: cart.cartItems.map((item) => ({
          productName: item.variant.product.name,
          variantName: item.variant.name,
          sku: item.variant.sku,
          quantity: item.quantity,
        })),
        valueAtCurrentPrices: paiseToRupees(
          cart.cartItems.reduce(
            (total, item) =>
              total + unitPrice(item.variant, now) * item.quantity,
            0,
          ),
        ),
        lastActivityAt: cart.cartItems.reduce(
          (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
          cart.updatedAt,
        ),
      })),
      nextCursor: page.nextCursor,
    };
  }
}
export const reportService = new ReportService();
