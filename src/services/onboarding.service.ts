import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type OnboardingInput = {
  branchName?: string;
  organizationName?: string;
  ownerFullName: string;
};

export class DeletedOrganizationError extends Error {
  constructor() {
    super(
      "This organization has been deleted. Contact an administrator if recovery is required.",
    );
  }
}

export class DisabledMembershipError extends Error {
  constructor() {
    super("Your team access has been disabled. Contact the organization owner.");
  }
}

export async function ensureOwnerOnboarding(
  supabase: SupabaseClient<Database>,
  input: OnboardingInput,
) {
  const { data, error } = await supabase.rpc("complete_account_onboarding", {
    account_full_name: input.ownerFullName,
  });

  if (error) {
    if (error.message.includes("ORGANIZATION_DELETED")) {
      throw new DeletedOrganizationError();
    }
    if (error.message.includes("MEMBER_DISABLED")) {
      throw new DisabledMembershipError();
    }
    throw new Error("Could not initialize the business account.", {
      cause: error,
    });
  }

  return data;
}
