"use client";

import type { OrderPaymentStatus } from "@eshanika/database/enums";
import { Button } from "@eshanika/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@eshanika/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/patterns/page-state";
import { PaymentStatusBadge } from "@/features/orders/components/order-badges";
import { formatDateTime } from "@/lib/format";
import { orpc } from "@/orpc/query";
import {
  formatPaise,
  PAYMENT_METHOD_LABELS,
  PaymentAttemptBadge,
  RefundStatusBadge,
} from "./payment-badges";
import { RefundDialog } from "./refund-dialog";

export function OrderPayments({
  orderId,
  paymentStatus,
  paidAt,
  canRefund,
}: {
  orderId: string;
  paymentStatus: OrderPaymentStatus;
  paidAt: string | Date | null;
  canRefund: boolean;
}) {
  const [refunding, setRefunding] = useState<{
    paymentId: string;
    refundableMinor: number;
  } | null>(null);
  const paymentOrders = useQuery(
    orpc.payments.forOrder.queryOptions({ input: { orderId } }),
  );
  const payments = (paymentOrders.data ?? []).flatMap(
    (paymentOrder) => paymentOrder.payments,
  );

  return (
    <Card id="payment">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Payment
          <PaymentStatusBadge status={paymentStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {paidAt ? (
          <p className="text-muted-foreground">Paid {formatDateTime(paidAt)}</p>
        ) : null}
        {paymentOrders.isPending ? (
          <LoadingState rows={2} />
        ) : paymentOrders.isError ? (
          <ErrorState
            error={paymentOrders.error}
            onRetry={() => paymentOrders.refetch()}
          />
        ) : payments.length === 0 ? (
          <p className="text-muted-foreground">No payment attempts recorded.</p>
        ) : (
          <ul className="space-y-3">
            {payments.map((payment) => (
              <li className="space-y-2 rounded-lg border p-3" key={payment.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <PaymentAttemptBadge status={payment.status} />
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {payment.paymentMethod
                        ? (PAYMENT_METHOD_LABELS[payment.paymentMethod] ??
                          payment.paymentMethod)
                        : "Method unknown"}{" "}
                      ·{" "}
                      {formatDateTime(payment.capturedAt ?? payment.createdAt)}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {payment.providerPaymentId}
                    </p>
                  </div>
                  <span className="shrink-0 text-right tabular-nums">
                    {formatPaise(payment.amountMinor)}
                    {payment.amountRefundedMinor !== "0" ? (
                      <span className="block text-xs text-muted-foreground">
                        {formatPaise(payment.amountRefundedMinor)} refunded
                      </span>
                    ) : null}
                  </span>
                </div>
                {payment.errorDescription ? (
                  <p className="text-xs text-destructive">
                    {payment.errorDescription}
                  </p>
                ) : null}
                {payment.refunds.length > 0 ? (
                  <ul className="space-y-2 border-t pt-2">
                    {payment.refunds.map((refund) => (
                      <li key={refund.id}>
                        <div className="flex items-center justify-between gap-2">
                          <RefundStatusBadge status={refund.status} />
                          <span className="tabular-nums">
                            {formatPaise(refund.amountMinor)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {refund.reason ?? "No reason given"} ·{" "}
                          {refund.requestedByUser?.name ?? "Razorpay"} ·{" "}
                          {formatDateTime(
                            refund.processedAt ?? refund.requestedAt,
                          )}
                        </p>
                        {refund.failureReason ? (
                          <p className="text-xs text-destructive">
                            {refund.failureReason}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {canRefund && payment.refundableMinor !== "0" ? (
                  <Button
                    className="w-full"
                    onClick={() =>
                      setRefunding({
                        paymentId: payment.id,
                        refundableMinor: Number(payment.refundableMinor),
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    Refund
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {refunding ? (
        <RefundDialog
          onOpenChange={(open) => {
            if (!open) setRefunding(null);
          }}
          open
          orderId={orderId}
          paymentId={refunding.paymentId}
          refundableMinor={refunding.refundableMinor}
        />
      ) : null}
    </Card>
  );
}
