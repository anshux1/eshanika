export type PasswordResetEmail = {
	subject: string;
	text: string;
};

// Pure template with no sending logic, so it can be reused for previews and
// tests without touching the email provider.
export function passwordResetEmail(url: string): PasswordResetEmail {
	return {
		subject: "Reset your Eshanika admin password",
		text: `Reset your password with this link (valid for 1 hour): ${url}`,
	};
}
