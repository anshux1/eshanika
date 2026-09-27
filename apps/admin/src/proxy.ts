import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIES = [
  "better-auth.session_token",
  "better-auth-session_token",
  "__Secure-better-auth.session_token",
];

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/sign-in" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/invite/") ||
    // API and RPC routes answer with JSON errors, never redirects.
    pathname.startsWith("/api/") ||
    pathname === "/rpc" ||
    pathname.startsWith("/rpc/")
  );
}

// Optimistic guard only. It redirects visitors without a session cookie and
// never touches the database. requireAdmin and adminProcedure do the real
// checks on every request.
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  const hasSession = SESSION_COOKIES.some(
    (name) => request.cookies.get(name)?.value,
  );
  if (!hasSession) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
