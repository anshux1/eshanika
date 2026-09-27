import { emailEnv } from "@eshanika/env/email";
import { Resend } from "resend";

export type SendEmailInput = {
	to: string;
	subject: string;
	text: string;
};

// The only way email leaves the system. With an API key it goes through
// Resend, without one the message is logged in development only so flows stay
// testable before email is configured. Production without a key fails loudly
// in the server logs instead of silently dropping the email.
export async function sendEmail(input: SendEmailInput): Promise<void> {
	const apiKey = emailEnv.RESEND_API_KEY;
	const from = emailEnv.EMAIL_FROM;
	if (!apiKey || !from) {
		if (process.env.NODE_ENV === "production") {
			throw new Error(
				"RESEND_API_KEY and EMAIL_FROM are required to send email",
			);
		}
		console.info(
			`[email] to=${input.to} subject="${input.subject}"\n${input.text}`,
		);
		return;
	}
	const resend = new Resend(apiKey);
	const { error } = await resend.emails.send({
		from,
		to: input.to,
		subject: input.subject,
		text: input.text,
	});
	if (error) {
		throw new Error("Email failed to send");
	}
}
