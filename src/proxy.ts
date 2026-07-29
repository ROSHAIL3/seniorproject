import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnvironment, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("error", "supabase-not-configured");
    return NextResponse.redirect(signInUrl);
  }

  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabaseEnvironment();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signInUrl);
  }

  return response;
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
