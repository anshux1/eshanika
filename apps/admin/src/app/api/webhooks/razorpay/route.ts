import { paymentService } from "@/features/payments/PaymentService";

export async function POST(request: Request) {
  // The signature covers the exact bytes Razorpay sent, so read the body as text.
  const rawBody = await request.text();
  const result = await paymentService.receiveWebhook(
    rawBody,
    request.headers.get("x-razorpay-signature"),
    request.headers.get("x-razorpay-event-id"),
  );
  return Response.json({ message: result.message }, { status: result.status });
}
