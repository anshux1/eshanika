import { db } from "@eshanika/database/db";

// Better Auth only limits `/api/auth/*`. This covers public oRPC routes and
// shares Better Auth's `RateLimit` table, so limits survive restarts.
export async function consumeRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const now = Date.now();
  const current = await db.rateLimit.findUnique({
    where: { key },
    select: { count: true, lastRequest: true },
  });

  if (!current || now - Number(current.lastRequest) > windowMs) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, lastRequest: BigInt(now) },
      update: { count: 1, lastRequest: BigInt(now) },
    });
    return true;
  }
  if (current.count >= max) return false;

  await db.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 }, lastRequest: BigInt(now) },
  });
  return true;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
