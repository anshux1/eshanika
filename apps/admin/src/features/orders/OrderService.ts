import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "@/orpc/audit";
import { orderRepository } from "./PrismaOrderRepository";
import type {
  OrderCancelInput,
  OrderListInput,
  OrderNoteInput,
  OrderTransitionInput,
} from "./schema";
export class OrderService {
  list(input: OrderListInput) {
    if (input.from && input.to && Date.parse(input.from) > Date.parse(input.to))
      throw new AdminError(
        "BAD_REQUEST",
        "Start date must be before end date.",
      );
    return orderRepository.list(input);
  }
  async get(id: string) {
    const order = await orderRepository.get(id);
    if (!order) throw new AdminError("NOT_FOUND", "Order not found.");
    return order;
  }
  transition(input: OrderTransitionInput, actor: AdminActor) {
    return orderRepository.transition(input, actor);
  }
  cancel(input: OrderCancelInput, actor: AdminActor) {
    return orderRepository.cancel(input, actor);
  }
  addNote(input: OrderNoteInput, actor: AdminActor) {
    return orderRepository.addNote(input, actor);
  }
}
export const orderService = new OrderService();
