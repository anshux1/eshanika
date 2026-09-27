type AuthClientError = { status?: number; code?: string; message?: string };

// Better Auth returns raw codes; admins see short, plain sentences instead.
export function authErrorMessage(error: AuthClientError): string {
  if (error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return "That email and password don't match.";
  }
  if (error.code === "INVALID_TOKEN") {
    return "This reset link has expired. Request a new one.";
  }
  return "Something went wrong. Try again.";
}
