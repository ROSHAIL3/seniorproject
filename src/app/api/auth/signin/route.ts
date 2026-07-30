import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DeletedOrganizationError,
  DisabledMembershipError,
  ensureOwnerOnboarding,
} from "@/services/onboarding.service";
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
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  const metadata = data.user.user_metadata;
  const ownerFullName =
    String(metadata.full_name ?? "").trim() ||
    [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim() ||
    email.split("@")[0];

  try {
    await ensureOwnerOnboarding(supabase, { ownerFullName });
    await syncAuthenticatedProfileFromAuth(data.user, supabase);
  } catch (onboardingError) {
    await supabase.auth.signOut();
    if (
      onboardingError instanceof DeletedOrganizationError ||
      onboardingError instanceof DisabledMembershipError
    ) {
      return NextResponse.json(
        { error: onboardingError.message },
        { headers: noStoreHeaders, status: 403 },
      );
    }
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
