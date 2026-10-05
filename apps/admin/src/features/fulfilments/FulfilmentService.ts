import type { AdminActor } from "@/orpc/audit";
import { fulfilmentRepository } from "./PrismaFulfilmentRepository";
import type {
  AddFulfilmentEventInput,
  CreateFulfilmentInput,
  TransitionFulfilmentInput,
} from "./schema";
export class FulfilmentService {
  create(input: CreateFulfilmentInput, actor: AdminActor) {
    return fulfilmentRepository.create(input, actor);
  }
  transition(input: TransitionFulfilmentInput, actor: AdminActor) {
    return fulfilmentRepository.transition(input, actor);
  }
  addEvent(input: AddFulfilmentEventInput, actor: AdminActor) {
    return fulfilmentRepository.addEvent(input, actor);
  }
}
export const fulfilmentService = new FulfilmentService();
