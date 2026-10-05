import { AdminError } from "./admin-error";

const MAX_RETRIES = 5;

export async function retryWriteConflict<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "P2034" || error.code === "P2002")
      )
        continue;
      throw error;
    }
  }
  throw new AdminError(
    "CONFLICT",
    "This record changed during the operation. Try again.",
  );
}
