import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }

  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Expires: "0",
        Pragma: "no-cache",
      },
    },
  );
}
