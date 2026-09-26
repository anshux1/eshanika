import { db } from "@eshanika/database/db";

export type AdminRole = "owner" | "editor" | "support";
export type AdminMembershipStatus = "active" | "suspended";

export type AdminMembership = {
	role: AdminRole;
	status: AdminMembershipStatus;
};

export class PrismaAdminMembershipRepository {
	async findByUserId(userId: string): Promise<AdminMembership | null> {
		const membership = await db.adminMembership.findUnique({
			where: { userId },
			select: {
				role: true,
				status: true,
			},
		});

		if (!membership) return null;
		if (
			membership.role !== "owner" &&
			membership.role !== "editor" &&
			membership.role !== "support"
		) {
			return null;
		}
		if (membership.status !== "active" && membership.status !== "suspended") {
			return null;
		}

		return {
			role: membership.role,
			status: membership.status,
		};
	}
}
