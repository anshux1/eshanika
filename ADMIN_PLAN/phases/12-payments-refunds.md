# 12 Payments and refunds

**Goal:** see every Razorpay payment and issue refunds safely.

## Build

- `lib/razorpay.ts`: API client and webhook signature check.
- `app/api/webhooks/razorpay/route.ts`: verify the signature over the raw body, save a `PaymentEvent` (unique per provider event ID, so duplicates are ignored), then process it. Failed events keep `processingStatus = failed` with `nextAttemptAt` for retry.
- Payments tab on `/orders/[id]`: payment orders, attempts, refunds.
- `/payments`: payments list with status and method filters. `/payments/events`: webhook inbox with a retry button for failed events.
- `refunds.create(paymentId, amount, reason, idempotencyKey)`: calls Razorpay, saves `Refund`, and updates `Payment.amountRefundedMinor` and `Order.paymentStatus` when confirmed.

## Rules

- Refund amount is at most captured minus already refunded minus pending refunds.
- If Razorpay's answer is unknown (timeout), the refund stays `pending` and a `refund.*` webhook settles it. It is never marked failed by guess.
- Raw payloads, keys, and card details are never sent to the browser.
- The store app will create payments at checkout. The admin owns the webhook route until the store exists.

## Done when

- In Razorpay Test Mode, a paid order is partially refunded, then refunded for the rest, and the order shows `refunded`.
- Sending the same webhook twice stores one event.
