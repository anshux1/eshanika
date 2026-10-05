import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { ArrowLeft, Mail, Phone, ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/patterns/status-badge";
import { addressLines, formatDate, formatDateTime } from "@/lib/format";
import type { RouterOutputs } from "@/orpc/types";

type Customer = RouterOutputs["customers"]["get"];

export function CustomerProfile({
  customer,
  orders,
}: {
  customer: Customer;
  orders: ReactNode;
}) {
  const cart = customer.carts[0];
  const cartUnits =
    cart?.cartItems.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <Button
          aria-label="Back to customers"
          nativeButton={false}
          render={
            <Link href="/customers">
              <ArrowLeft aria-hidden />
            </Link>
          }
          size="icon"
          variant="outline"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {customer.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer since {formatDate(customer.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">{orders}</div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a
                className="flex min-w-0 items-center gap-2 hover:underline hover:underline-offset-4"
                href={`mailto:${customer.email}`}
              >
                <Mail
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{customer.email}</span>
              </a>
              {customer.phoneNumber ? (
                <a
                  className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                  href={`tel:${customer.phoneNumber}`}
                >
                  <Phone
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  {customer.phoneNumber}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone aria-hidden className="size-4 shrink-0" />
                  No phone number
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved addresses</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.userAddresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No saved addresses.
                </p>
              ) : (
                <ul className="space-y-4">
                  {customer.userAddresses.map((address) => (
                    <li className="text-sm" key={address.id}>
                      <p className="flex items-center gap-2 font-medium">
                        {address.label ?? address.recipientName}
                        {address.isPrimary ? (
                          <StatusBadge tone="neutral">Primary</StatusBadge>
                        ) : null}
                      </p>
                      <address className="mt-1 text-muted-foreground not-italic">
                        {address.label ? (
                          <span className="block">{address.recipientName}</span>
                        ) : null}
                        {addressLines(address).map((line) => (
                          <span className="block" key={line}>
                            {line}
                          </span>
                        ))}
                        <span className="block">{address.phone}</span>
                      </address>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart aria-hidden className="size-4" />
                Active cart
              </CardTitle>
              {cart ? (
                <CardDescription>
                  {cartUnits} item{cartUnits === 1 ? "" : "s"}, updated{" "}
                  {formatDateTime(cart.updatedAt)}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {!cart || cart.cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  The cart is empty.
                </p>
              ) : (
                <ul className="space-y-3">
                  {cart.cartItems.map((item) => (
                    <li
                      className="flex items-start justify-between gap-3 text-sm"
                      key={item.id}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {item.variant.product.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.variant.name === item.variant.product.name
                            ? item.variant.sku
                            : `${item.variant.name} · ${item.variant.sku}`}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        × {item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
