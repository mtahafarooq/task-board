import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveAuthRedirect } from "@/lib/auth/redirect";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function middleware(request: NextRequest): NextResponse {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const target = resolveAuthRedirect(request.nextUrl.pathname, hasSession);

  if (target && target !== request.nextUrl.pathname) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/board/:path*"],
};
