import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type OnboardingInput = {
  branchName?: string;
  organizationName?: string;
  ownerFullName: string;
};

export async function ensureOwnerOnboarding(
  supabase: SupabaseClient<Database>,
  input: OnboardingInput,
) {
  const { data, error } = await supabase.rpc("ensure_owner_onboarding", {
    branch_name: input.branchName ?? "Main Branch",
    organization_name:
      input.organizationName || `${input.ownerFullName}'s Business`,
    owner_full_name: input.ownerFullName,
  });

  if (error) {
    throw new Error("Could not initialize the business account.", {
      cause: error,
    });
  }

  return data;
}
