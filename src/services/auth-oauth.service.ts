import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  const redirectTo = new URL("/auth/confirm", window.location.origin);
  redirectTo.searchParams.set("next", "/dashboard");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    },
  });
  if (error) throw new Error(error.message);
}
