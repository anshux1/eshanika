import { addressLines, formatDate } from "@/lib/format";
import type { OrderDetail } from "./order-model";
import { PrintButton } from "./print-button";

// Built from the order's snapshots. Prices and internal notes stay off the slip.
export function PackingSlip({ order }: { order: OrderDetail }) {
  const shipping = order.orderAddresses.find(
    (address) => address.addressType === "shipping",
  );
  const units = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="mx-auto w-full max-w-2xl bg-background px-6 py-10 text-foreground print:max-w-none print:p-0">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">Eshanika</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Packing slip
          </h1>
        </div>
        <PrintButton />
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Order</dt>
          <dd className="font-medium">{order.orderNumber}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Placed</dt>
          <dd className="font-medium">
            {formatDate(order.placedAt ?? order.createdAt)}
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="text-sm text-muted-foreground">Ship to</h2>
        {shipping ? (
          <address className="mt-1 text-sm not-italic">
            <span className="block font-medium">{shipping.recipientName}</span>
            {addressLines(shipping).map((line) => (
              <span className="block" key={line}>
                {line}
              </span>
            ))}
            <span className="block">{shipping.phone}</span>
          </address>
        ) : (
          <p className="mt-1 text-sm">No shipping address on this order.</p>
        )}
      </section>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium">SKU</th>
            <th className="py-2 text-right font-medium">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.orderItems.map((item) => (
            <tr className="border-b align-top" key={item.id}>
              <td className="py-2 pr-4">
                {item.productNameSnapshot}
                {item.variantNameSnapshot &&
                item.variantNameSnapshot !== item.productNameSnapshot ? (
                  <span className="block text-xs text-muted-foreground">
                    {item.variantNameSnapshot}
                  </span>
                ) : null}
              </td>
              <td className="py-2 pr-4 font-mono text-xs">
                {item.skuSnapshot}
              </td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-2 font-medium" colSpan={2}>
              Total units
            </td>
            <td className="py-2 text-right font-medium tabular-nums">
              {units}
            </td>
          </tr>
        </tfoot>
      </table>

      {order.customerNote ? (
        <section className="mt-8 rounded-lg border p-3 text-sm">
          <h2 className="font-medium">Note from customer</h2>
          <p className="mt-1 whitespace-pre-wrap">{order.customerNote}</p>
        </section>
      ) : null}
    </main>
  );
}
