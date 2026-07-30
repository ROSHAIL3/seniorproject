import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationFromDatabase } from "@/server/organization.repository";
import type { Database } from "@/types/database";
import type { WorkspaceIdentity } from "@/types/workspace-identity";

export async function getWorkspaceIdentityFromDatabase(): Promise<WorkspaceIdentity> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Authentication is required.");
  }

  const user = data.user;
  const [{ data: profile }, organization] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,email,avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    getOrganizationFromDatabase(supabase),
  ]);

  return {
    accountName:
      profile?.full_name?.trim() ||
      getMetadataName(user) ||
      user.email?.split("@")[0] ||
      "Team Member",
    email: profile?.email || user.email || "",
    organizationLogoUrl: organization.details.logo?.url,
    organizationName: organization.details.name,
    profileAvatarUrl:
      profile?.avatar_url?.trim() || getMetadataAvatar(user) || undefined,
  };
}

export async function syncAuthenticatedProfileFromAuth(
  user: User,
  client?: SupabaseClient<Database>,
) {
  const fullName = getMetadataName(user);
  const avatarUrl = getMetadataAvatar(user);
  const supabase = client ?? await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("The authenticated profile could not be loaded.");
  }

  const update: { avatar_url?: string; full_name?: string } = {};

  if (avatarUrl && avatarUrl !== profile?.avatar_url) update.avatar_url = avatarUrl;
  if (fullName && !profile?.full_name?.trim()) update.full_name = fullName;
  if (!Object.keys(update).length) return;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("The authenticated profile could not be synchronized.");
  }
}

function getMetadataName(user: User) {
  const metadata = user.user_metadata;
  return (
    String(metadata.full_name ?? metadata.name ?? "").trim() ||
    [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim()
  );
}

function getMetadataAvatar(user: User) {
  const metadata = user.user_metadata;
  return String(metadata.avatar_url ?? metadata.picture ?? "").trim();
}
