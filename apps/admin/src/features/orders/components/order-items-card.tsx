import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { Separator } from "@eshanika/ui/components/separator";
import Link from "next/link";
import { formatInr } from "@/lib/money";
import type { OrderDetail } from "./order-model";

// Amounts are snapshots taken when the order was placed; nothing is recalculated here.
function isZero(amount: string) {
  return /^0+(\.0+)?$/.test(amount);
}

export function OrderItemsCard({ order }: { order: OrderDetail }) {
  const rows = [
    { label: "Subtotal", amount: order.subtotalAmount },
    ...(isZero(order.discountAmount)
      ? []
      : [
          {
            label: order.couponRedemption
              ? `Discount (${order.couponRedemption.coupon.code})`
              : "Discount",
            amount: `-${order.discountAmount}`,
          },
        ]),
    ...order.orderFees.map((fee) => ({ label: fee.name, amount: fee.amount })),
    {
      label: "Shipping",
      amount: order.shippingAmount,
      free: isZero(order.shippingAmount),
    },
    ...(isZero(order.taxAmount)
      ? []
      : [{ label: "Tax", amount: order.taxAmount }]),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {order.orderItems.map((item) => (
            <li
              className="flex items-start justify-between gap-4 py-3 first:pt-0"
              key={item.id}
            >
              <div className="min-w-0">
                {item.productId ? (
                  <Link
                    className="block truncate font-medium hover:underline hover:underline-offset-4"
                    href={`/products/${item.productId}`}
                  >
                    {item.productNameSnapshot}
                  </Link>
                ) : (
                  <span className="block truncate font-medium">
                    {item.productNameSnapshot}
                  </span>
                )}
                <span className="block truncate text-xs text-muted-foreground">
                  {item.variantNameSnapshot &&
                  item.variantNameSnapshot !== item.productNameSnapshot
                    ? `${item.variantNameSnapshot} · `
                    : ""}
                  {item.skuSnapshot}
                </span>
              </div>
              <div className="shrink-0 text-right text-sm tabular-nums">
                <span className="block font-medium">
                  {formatInr(item.totalAmount)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.quantity} × {formatInr(item.unitPrice)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <Separator />
        <dl className="space-y-1.5 text-sm">
          {rows.map((row) => (
            <div className="flex justify-between gap-4" key={row.label}>
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular-nums">
                {"free" in row && row.free ? "Free" : formatInr(row.amount)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatInr(order.totalAmount)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
