import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  TEMPORARY_AUTH_BYPASS,
  isAuthenticatedSession,
} from "@/services/auth.service";

export function proxy(request: NextRequest) {
  if (TEMPORARY_AUTH_BYPASS) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!isAuthenticatedSession(session)) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/appointments/:path*",
    "/calendar/:path*",
    "/customers/:path*",
    "/invoices/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/blank/:path*",
    "/basic-tables/:path*",
    "/line-chart/:path*",
    "/bar-chart/:path*",
    "/buttons/:path*",
    "/images",
    "/videos/:path*",
    "/avatars/:path*",
    "/modals/:path*",
    "/alerts/:path*",
    "/badge/:path*",
    "/form-elements/:path*",
  ],
};
