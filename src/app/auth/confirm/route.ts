import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureOwnerOnboarding } from "@/services/onboarding.service";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  if (!isSupabaseConfigured() || (!code && (!tokenHash || !type))) {
    return NextResponse.redirect(
      new URL("/signin?error=confirmation-failed", requestUrl.origin),
    );
  }

  const supabase = await createClient();
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type!,
      });

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/signin?error=confirmation-failed", requestUrl.origin),
    );
  }

  const metadata = data.user.user_metadata;
  const ownerFullName =
    String(metadata.full_name ?? "").trim() ||
    [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim() ||
    data.user.email?.split("@")[0] ||
    "Slotova Owner";

  try {
    await ensureOwnerOnboarding(supabase, { ownerFullName });
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/signin?error=onboarding-failed", requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
