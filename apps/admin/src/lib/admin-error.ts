export type AdminErrorCode =
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS";

// Services throw this instead of oRPC errors so they stay framework-free.
// The error middleware in `orpc/procedures.ts` turns it into an ORPCError.
export class AdminError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AdminError";
  }
}
