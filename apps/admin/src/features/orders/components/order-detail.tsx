"use client";

import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleAlert, Printer } from "lucide-react";
import Link from "next/link";
import { FulfilmentSection } from "@/features/fulfilments/components/fulfilment-section";
import { addressLines, formatDateTime } from "@/lib/format";
import { formatInr, paiseToRupees } from "@/lib/money";
import { orpc } from "@/orpc/query";
import { OrderActions } from "./order-actions";
import {
  FulfilmentStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "./order-badges";
import { OrderItemsCard } from "./order-items-card";
import { type OrderDetail as Order, refundNeeded } from "./order-model";
import { OrderNotes } from "./order-notes";
import { OrderTimeline } from "./order-timeline";

type Address = Order["orderAddresses"][number];

function sameAddress(a: Address | undefined, b: Address | undefined) {
  if (!a || !b) return false;
  return (
    a.recipientName === b.recipientName &&
    a.phone === b.phone &&
    addressLines(a).join("|") === addressLines(b).join("|")
  );
}

export function OrderDetail({
  initialOrder,
  canWrite,
}: {
  initialOrder: Order;
  canWrite: boolean;
}) {
  const query = useQuery({
    ...orpc.orders.get.queryOptions({ input: { id: initialOrder.id } }),
    initialData: initialOrder,
  });
  const order = query.data;
  const shipping = order.orderAddresses.find(
    (address) => address.addressType === "shipping",
  );
  const billing = order.orderAddresses.find(
    (address) => address.addressType === "billing",
  );
  const payments = order.paymentOrders.flatMap(
    (paymentOrder) => paymentOrder.payments,
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            aria-label="Back to orders"
            nativeButton={false}
            render={
              <Link href="/orders">
                <ArrowLeft aria-hidden />
              </Link>
            }
            size="icon"
            variant="outline"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              Placed {formatDateTime(order.placedAt ?? order.createdAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
              <FulfilmentStatusBadge status={order.fulfillmentStatus} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={
              <Link href={`/orders/${order.id}/packing-slip`} target="_blank">
                <Printer aria-hidden />
                Packing slip
              </Link>
            }
            variant="outline"
          />
          {canWrite ? <OrderActions order={order} /> : null}
        </div>
      </div>

      {order.status === "cancelled" ? (
        <div
          className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
          role="status"
        >
          <CircleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <div>
            <p className="font-medium">
              Cancelled
              {order.cancelledAt
                ? ` on ${formatDateTime(order.cancelledAt)}`
                : ""}
            </p>
            {order.cancelledReason ? (
              <p className="text-muted-foreground">{order.cancelledReason}</p>
            ) : null}
            {refundNeeded(order) ? (
              <p className="mt-1">
                This order was paid, so it needs a refund. Cancelling doesn't
                refund automatically.{" "}
                <a
                  className="font-medium underline underline-offset-4"
                  href="#payment"
                >
                  See payment
                </a>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <OrderItemsCard order={order} />
          <FulfilmentSection canWrite={canWrite} order={order} />
          <OrderTimeline order={order} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="min-w-0">
                {order.user ? (
                  <Link
                    className="block truncate font-medium hover:underline hover:underline-offset-4"
                    href={`/customers/${order.user.id}`}
                  >
                    {order.user.name}
                  </Link>
                ) : (
                  <p className="font-medium">Guest</p>
                )}
                <a
                  className="block truncate text-muted-foreground hover:underline hover:underline-offset-4"
                  href={`mailto:${order.billingEmail}`}
                >
                  {order.billingEmail}
                </a>
              </div>
              {order.customerNote ? (
                <div className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Note from customer
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap">
                    {order.customerNote}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {[
                { label: "Ship to", address: shipping },
                {
                  label: "Bill to",
                  address: sameAddress(shipping, billing) ? undefined : billing,
                  fallback: billing ? "Same as shipping" : "Not given",
                },
              ].map(({ label, address, fallback = "Not given" }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  {address ? (
                    <address className="mt-0.5 not-italic">
                      <span className="block font-medium">
                        {address.recipientName}
                      </span>
                      {addressLines(address).map((line) => (
                        <span className="block" key={line}>
                          {line}
                        </span>
                      ))}
                      <span className="block text-muted-foreground">
                        {address.phone}
                      </span>
                    </address>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground">{fallback}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card id="payment">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                Payment
                <PaymentStatusBadge status={order.paymentStatus} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.paidAt ? (
                <p className="text-muted-foreground">
                  Paid {formatDateTime(order.paidAt)}
                </p>
              ) : null}
              {payments.length === 0 ? (
                <p className="text-muted-foreground">
                  No payment attempts recorded.
                </p>
              ) : (
                <ul className="space-y-2">
                  {payments.map((payment) => (
                    <li className="flex justify-between gap-3" key={payment.id}>
                      <span className="capitalize">
                        {payment.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-right tabular-nums">
                        {formatInr(paiseToRupees(Number(payment.amountMinor)))}
                        {payment.amountRefundedMinor !== "0" ? (
                          <span className="block text-xs text-muted-foreground">
                            {formatInr(
                              paiseToRupees(
                                Number(payment.amountRefundedMinor),
                              ),
                            )}{" "}
                            refunded
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Refunds can't be issued from the admin yet.
              </p>
            </CardContent>
          </Card>

          <OrderNotes canWrite={canWrite} order={order} />
        </div>
      </div>
    </div>
  );
}
