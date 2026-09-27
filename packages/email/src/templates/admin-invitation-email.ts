export type AdminInvitationEmail = {
	subject: string;
	text: string;
};

export function adminInvitationEmail(url: string): AdminInvitationEmail {
	return {
		subject: "You're invited to Eshanika Admin",
		text: `You have been invited to Eshanika Admin. Open this link to accept the invitation and set up your account. It expires in 7 days.\n\n${url}`,
	};
}
