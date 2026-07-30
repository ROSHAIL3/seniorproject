import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureOwnerOnboarding } from "@/services/onboarding.service";
import { syncAuthenticatedProfileFromAuth } from "@/server/workspace-identity.repository";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
  Expires: "0",
  Pragma: "no-cache",
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { headers: noStoreHeaders, status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const acceptedTerms = body.acceptedTerms === true;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "First name, last name, email, and password are required." },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  if (!acceptedTerms) {
    return NextResponse.json(
      { error: "You must accept the terms and privacy policy." },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const ownerFullName = `${firstName} ${lastName}`.trim();
  const requestUrl = new URL(request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        full_name: ownerFullName,
        last_name: lastName,
      },
      emailRedirectTo: `${requestUrl.origin}/auth/confirm`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  if (data.session) {
    try {
      await ensureOwnerOnboarding(supabase, { ownerFullName });
      if (data.user) {
        await syncAuthenticatedProfileFromAuth(data.user, supabase);
      }
    } catch {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Your business account could not be initialized." },
        { headers: noStoreHeaders, status: 500 },
      );
    }

    return NextResponse.json(
      { redirectTo: "/dashboard", success: true },
      { headers: noStoreHeaders },
    );
  }

  return NextResponse.json(
    {
      message: "Check your email to confirm your account.",
      requiresEmailConfirmation: true,
      success: true,
    },
    { headers: noStoreHeaders },
  );
}
