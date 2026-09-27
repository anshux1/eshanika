import { PrismaAdminMembershipRepository } from "./repositories/prisma-admin-membership-repository";

export type {
	AdminIdentity,
	AdminMembershipStatus,
	AdminRole,
	UserRole,
} from "./repositories/prisma-admin-membership-repository";

const adminMembershipRepository = new PrismaAdminMembershipRepository();

export function getAdminIdentity(userId: string) {
	return adminMembershipRepository.findAdminIdentity(userId);
}

// The single check every admin gate reuses: User.role must be admin and the
// membership must be active. Read on every request so a suspended or revoked
// admin loses access right away.
export async function getActiveAdmin(userId: string) {
	const identity = await adminMembershipRepository.findAdminIdentity(userId);
	if (!identity) {
		return null;
	}
	if (identity.userRole !== "admin") {
		return null;
	}
	if (identity.membershipStatus !== "active") {
		return null;
	}
	return identity;
}
