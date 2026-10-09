import { razorpayEnv } from "@eshanika/env/razorpay";
import Razorpay from "razorpay";

const REFUND_TIMEOUT_MS = 20_000;

let client: Razorpay | undefined;

function getRazorpay() {
  if (client) return client;
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = razorpayEnv;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  client = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  return client;
}

export function isRazorpayConfigured() {
  return Boolean(
    razorpayEnv.RAZORPAY_KEY_ID && razorpayEnv.RAZORPAY_KEY_SECRET,
  );
}

// Razorpay signs the exact bytes it sent, so this must get the raw body, never re-serialised JSON.
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = razorpayEnv.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    return Razorpay.validateWebhookSignature(rawBody, signature, secret);
  } catch {
    return false;
  }
}

export type ProviderRefund = {
  id: string;
  status: "pending" | "processed" | "failed";
  speedProcessed: "normal" | "instant" | null;
  createdAt: Date;
  acquirerReference: string | null;
};

// "unknown" means Razorpay may or may not have created the refund, so the
// caller keeps it pending and lets the refund webhook settle it.
export type RefundResult =
  | { outcome: "accepted"; refund: ProviderRefund }
  | { outcome: "rejected"; message: string }
  | { outcome: "unknown" };

function rejectionMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const statusCode = "statusCode" in error ? Number(error.statusCode) : NaN;
  // 4xx answers mean Razorpay refused the request, so no refund exists.
  if (!(statusCode >= 400 && statusCode < 500) || statusCode === 408)
    return null;
  const description =
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "description" in error.error &&
    typeof error.error.description === "string"
      ? error.error.description
      : null;
  return description ?? "Razorpay refused the refund.";
}

export function toProviderRefund(entity: {
  id: string;
  status: string;
  speed_processed?: string | null;
  created_at: number;
  acquirer_data?: Record<string, unknown> | null;
}): ProviderRefund {
  const arn = entity.acquirer_data?.arn ?? entity.acquirer_data?.rrn;
  return {
    id: entity.id,
    status:
      entity.status === "processed" || entity.status === "failed"
        ? entity.status
        : "pending",
    speedProcessed:
      entity.speed_processed === "instant" ||
      entity.speed_processed === "normal"
        ? entity.speed_processed
        : null,
    createdAt: new Date(entity.created_at * 1000),
    acquirerReference: typeof arn === "string" ? arn : null,
  };
}

export async function createRazorpayRefund(input: {
  providerPaymentId: string;
  amountMinor: number;
  refundId: string;
}): Promise<RefundResult> {
  const razorpay = getRazorpay();
  if (!razorpay)
    return { outcome: "rejected", message: "Razorpay isn't configured yet." };
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), REFUND_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([
      razorpay.payments.refund(input.providerPaymentId, {
        amount: input.amountMinor,
        speed: "normal",
        receipt: input.refundId,
        // The webhook uses this to find our row when the API answer was lost.
        notes: { refundId: input.refundId },
      }),
      timeout,
    ]);
    if (response === "timeout") return { outcome: "unknown" };
    return { outcome: "accepted", refund: toProviderRefund(response) };
  } catch (error) {
    const message = rejectionMessage(error);
    return message ? { outcome: "rejected", message } : { outcome: "unknown" };
  } finally {
    clearTimeout(timer);
  }
}
