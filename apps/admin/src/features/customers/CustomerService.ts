import { AdminError } from "@/lib/admin-error";
import { customerRepository } from "./PrismaCustomerRepository";
import type { CustomerListInput, CustomerOrdersInput } from "./schema";
export class CustomerService {
  list(input: CustomerListInput) {
    return customerRepository.list(input);
  }
  async get(id: string) {
    const customer = await customerRepository.get(id);
    if (!customer) throw new AdminError("NOT_FOUND", "Customer not found.");
    return customer;
  }
  async orders(input: CustomerOrdersInput) {
    const orders = await customerRepository.orders(input);
    if (!orders) throw new AdminError("NOT_FOUND", "Customer not found.");
    return orders;
  }
}
export const customerService = new CustomerService();
