import { db } from "@eshanika/database/db";
import { toPage } from "@eshanika/orpc/pagination";
import type { CustomerListInput, CustomerOrdersInput } from "./schema";

export class PrismaCustomerRepository {
  async list(input: CustomerListInput) {
    const users = await db.user.findMany({
      where: {
        role: "customer",
        OR: input.search
          ? [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
              { phoneNumber: { contains: input.search } },
            ]
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
      },
    });
    const page = toPage(users, input.limit, (user) => user.id);
    const summary = await db.order.groupBy({
      by: ["userId"],
      where: {
        userId: { in: page.items.map((user) => user.id) },
        status: { not: "cancelled" },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
    });
    const byUser = new Map(summary.map((row) => [row.userId, row]));
    return {
      items: page.items.map((user) => {
        const row = byUser.get(user.id);
        return {
          ...user,
          orderCount: row?._count.id ?? 0,
          totalSpent: row?._sum.totalAmount?.toString() ?? "0.00",
          lastOrderAt: row?._max.createdAt ?? null,
        };
      }),
      nextCursor: page.nextCursor,
    };
  }

  async get(id: string) {
    const customer = await db.user.findFirst({
      where: { id, role: "customer" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        userAddresses: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            label: true,
            recipientName: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            landmark: true,
            city: true,
            state: true,
            postalCode: true,
            countryCode: true,
            isPrimary: true,
          },
        },
        carts: {
          where: { status: "active" },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            updatedAt: true,
            cartItems: {
              select: {
                id: true,
                quantity: true,
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    product: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!customer) return null;
    return customer;
  }

  async orders(input: CustomerOrdersInput) {
    const customer = await db.user.findFirst({
      where: { id: input.customerId, role: "customer" },
      select: { id: true },
    });
    if (!customer) return null;
    const rows = await db.order.findMany({
      where: { userId: input.customerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: input.cursor ? { id: input.cursor } : undefined,
      skip: input.cursor ? 1 : 0,
      take: input.limit + 1,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        totalAmount: true,
        createdAt: true,
      },
    });
    const page = toPage(rows, input.limit, (order) => order.id);
    return {
      items: page.items.map((order) => ({
        ...order,
        totalAmount: order.totalAmount.toString(),
      })),
      nextCursor: page.nextCursor,
    };
  }
}
export const customerRepository = new PrismaCustomerRepository();
