import { AdminError } from "@/lib/admin-error";
import { rupeesToPaise } from "@/lib/money";
import {
  createRazorpayRefund,
  isRazorpayConfigured,
  verifyWebhookSignature,
} from "@/lib/razorpay";
import type { AdminActor } from "@/orpc/audit";
import { paymentRepository, toRefund } from "./PrismaPaymentRepository";
import type {
  PaymentEventListInput,
  PaymentListInput,
  RefundInput,
} from "./schema";
import { webhookEnvelope } from "./webhook-payload";

const MAX_EVENT_ID_LENGTH = 100;

export class PaymentService {
  list(input: PaymentListInput) {
    return paymentRepository.list(input);
  }
  forOrder(orderId: string) {
    return paymentRepository.forOrder(orderId);
  }
  events(input: PaymentEventListInput) {
    return paymentRepository.events(input);
  }
  retryEvent(id: string) {
    return paymentRepository.processEvent(id);
  }

  // Answers with the HTTP status Razorpay should see. Once an event is stored
  // the answer is 200 even if processing fails, because it can be retried here.
  async receiveWebhook(
    rawBody: string,
    signature: string | null,
    eventId: string | null,
  ) {
    if (!signature || !verifyWebhookSignature(rawBody, signature))
      return { status: 400, message: "Invalid signature" };
    if (!eventId || eventId.length > MAX_EVENT_ID_LENGTH)
      return { status: 400, message: "Missing event ID" };
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return { status: 400, message: "Invalid JSON" };
    }
    const envelope = webhookEnvelope.safeParse(json);
    if (!envelope.success) return { status: 400, message: "Unknown payload" };
    const stored = await paymentRepository.storeEvent(eventId, envelope.data);
    if (!stored) return { status: 200, message: "Duplicate" };
    await paymentRepository.processEvent(stored.id);
    return { status: 200, message: "OK" };
  }

  async createRefund(input: RefundInput, actor: AdminActor) {
    if (!isRazorpayConfigured())
      throw new AdminError(
        "BAD_REQUEST",
        "Razorpay isn't configured, so refunds can't be sent yet.",
      );
    const amountMinor = BigInt(rupeesToPaise(input.amount));
    if (amountMinor <= 0n)
      throw new AdminError("BAD_REQUEST", "Enter an amount above zero.");
    const { refund, providerPaymentId } = await paymentRepository.reserveRefund(
      input,
      amountMinor,
      actor,
    );
    // A repeated request returns the first attempt instead of calling Razorpay again.
    if (!providerPaymentId) return toRefund(refund);
    const result = await createRazorpayRefund({
      providerPaymentId,
      amountMinor: Number(amountMinor),
      refundId: refund.id,
    });
    return paymentRepository.recordRefundResult(refund.id, result, actor);
  }
}
export const paymentService = new PaymentService();
