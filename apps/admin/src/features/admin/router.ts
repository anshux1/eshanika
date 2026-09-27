import { AdminRole } from "@eshanika/database/enums";
import { z } from "zod";
import { getRolePermissions } from "@/orpc/permissions";
import { adminProcedure } from "@/orpc/procedures";

export const adminRouter = {
  me: adminProcedure()
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.email(),
        image: z.string().nullable(),
        role: z.enum(AdminRole),
        permissions: z.array(z.string()),
      }),
    )
    .handler(async ({ context }) => ({
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      image: context.user.image ?? null,
      role: context.admin.membershipRole,
      permissions: [...getRolePermissions(context.admin.membershipRole)],
    })),
};
