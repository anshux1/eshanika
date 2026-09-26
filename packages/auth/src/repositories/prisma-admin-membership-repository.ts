import { db } from "@eshanika/database/db";
import type {
	AdminMembershipStatus,
	AdminRole,
} from "@eshanika/database/enums";

export type { AdminMembershipStatus, AdminRole };

export type AdminMembership = {
	role: AdminRole;
	status: AdminMembershipStatus;
};

export class PrismaAdminMembershipRepository {
	findByUserId(userId: string): Promise<AdminMembership | null> {
		return db.adminMembership.findUnique({
			where: { userId },
			select: {
				role: true,
				status: true,
			},
		});
	}
}
