import { PrismaAdminMembershipRepository } from "./repositories/prisma-admin-membership-repository";

export type {
	AdminMembership,
	AdminMembershipStatus,
	AdminRole,
} from "./repositories/prisma-admin-membership-repository";

const adminMembershipRepository = new PrismaAdminMembershipRepository();

export function getAdminMembership(userId: string) {
	return adminMembershipRepository.findByUserId(userId);
}
