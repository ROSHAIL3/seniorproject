import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnvironment } from "./env";
import type { Database } from "@/types/database";

export function createPublicServerClient() {
  const { publishableKey, url } = getSupabaseEnvironment();
  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

