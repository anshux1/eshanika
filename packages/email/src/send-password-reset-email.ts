import { sendEmail } from "./send-email";
import { passwordResetEmail } from "./templates/password-reset-email";

// The canonical sender for admin password resets. Call sites use this; the
// template stays importable on its own for previews and tests.
export async function sendPasswordResetEmail(
	to: string,
	url: string,
): Promise<void> {
	await sendEmail({ to, ...passwordResetEmail(url) });
}
