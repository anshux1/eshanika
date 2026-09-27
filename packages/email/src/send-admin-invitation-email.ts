import { authEnv } from "@eshanika/env/auth";
import { sendEmail } from "./send-email";
import { adminInvitationEmail } from "./templates/admin-invitation-email";

export function createAdminInvitationUrl(token: string): string {
	return new URL(`/invite/${token}`, authEnv.BETTER_AUTH_URL).toString();
}

export async function sendAdminInvitationEmail(
	to: string,
	url: string,
): Promise<void> {
	await sendEmail({ to, ...adminInvitationEmail(url) });
}
