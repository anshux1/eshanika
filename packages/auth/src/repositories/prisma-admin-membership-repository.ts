import { db } from "@eshanika/database/db";
import type {
	AdminMembershipStatus,
	AdminRole,
	UserRole,
} from "@eshanika/database/enums";

export type { AdminMembershipStatus, AdminRole, UserRole };

export type AdminIdentity = {
	userId: string;
	userRole: UserRole;
	membershipRole: AdminRole;
	membershipStatus: AdminMembershipStatus;
};

export class PrismaAdminMembershipRepository {
	async findAdminIdentity(userId: string): Promise<AdminIdentity | null> {
		const membership = await db.adminMembership.findUnique({
			where: { userId },
			select: {
				role: true,
				status: true,
				user: {
					select: { id: true, role: true },
				},
			},
		});
		if (!membership) {
			return null;
		}
		return {
			userId: membership.user.id,
			userRole: membership.user.role,
			membershipRole: membership.role,
			membershipStatus: membership.status,
		};
	}
}
