import { adminProcedure } from "@/orpc/procedures";
import { paymentService } from "./PaymentService";
import { paymentSchemas } from "./schema";

export const paymentsRouter = {
  list: adminProcedure("payments.read")
    .input(paymentSchemas.list)
    .handler(({ input }) => paymentService.list(input)),
  forOrder: adminProcedure("payments.read")
    .input(paymentSchemas.forOrder)
    .handler(({ input }) => paymentService.forOrder(input.orderId)),
  events: adminProcedure("payments.read")
    .input(paymentSchemas.events)
    .handler(({ input }) => paymentService.events(input)),
  // Replays a stored, signature-checked Razorpay event. It moves no money by itself.
  retryEvent: adminProcedure("payments.read")
    .input(paymentSchemas.retryEvent)
    .handler(({ input }) => paymentService.retryEvent(input.id)),
};

export const refundsRouter = {
  create: adminProcedure("refunds.write")
    .input(paymentSchemas.refund)
    .handler(({ input, context }) =>
      paymentService.createRefund(input, context.actor),
    ),
};
