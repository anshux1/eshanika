import { AdminError } from "@/lib/admin-error";
import type { AdminActor } from "@/orpc/audit";
import { returnRepository } from "./PrismaReturnRepository";
import type {
  ReturnCreateInput,
  ReturnListInput,
  ReturnRestockInput,
  ReturnTransitionInput,
} from "./schema";

function assertDistinctLines(items: { orderItemId: string }[]) {
  const ids = new Set(items.map((item) => item.orderItemId));
  if (ids.size !== items.length)
    throw new AdminError("BAD_REQUEST", "Choose each order item once.");
}

export class ReturnService {
  list(input: ReturnListInput) {
    return returnRepository.list(input);
  }
  create(input: ReturnCreateInput, actor: AdminActor) {
    assertDistinctLines(input.items);
    return returnRepository.create(input, actor);
  }
  transition(input: ReturnTransitionInput, actor: AdminActor) {
    return returnRepository.transition(input, actor);
  }
  restock(input: ReturnRestockInput, actor: AdminActor) {
    assertDistinctLines(input.items);
    return returnRepository.restock(input, actor);
  }
}
export const returnService = new ReturnService();
