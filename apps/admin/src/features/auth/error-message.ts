type AuthClientError = { status?: number; code?: string; message?: string };

// Better Auth returns raw codes; admins see short, plain sentences instead.
// Add a line here to cover a new code.
const messagesByCode: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
  INVALID_TOKEN: "This reset link has expired. Request a new one.",
};

export function authErrorMessage(error: AuthClientError): string {
  // Rate limits come as an HTTP status, not a code.
  if (error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return (
    (error.code && messagesByCode[error.code]) ||
    "Something went wrong. Try again."
  );
}
