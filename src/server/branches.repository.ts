import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Branch, BranchInput, BranchStatus } from "@/types/branches";
import type { Database } from "@/types/database";

type BranchRow = Database["public"]["Tables"]["branches"]["Row"];

const statusToDatabase = {
  Active: "active",
  Archived: "archived",
  Inactive: "inactive",
} as const;

const statusFromDatabase: Record<BranchRow["status"], BranchStatus> = {
  active: "Active",
  archived: "Archived",
  inactive: "Inactive",
};

export class BranchRepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function mapBranch(row: BranchRow): Branch {
  return {
    address: row.address ?? "",
    code: row.code,
    createdAt: row.created_at,
    email: row.email ?? "",
    googleMapsUrl: row.google_maps_url ?? "",
    id: row.id,
    isMain: row.is_main,
    name: row.name,
    phone: row.phone ?? "",
    status: statusFromDatabase[row.status],
    timeZone: row.time_zone,
    updatedAt: row.updated_at,
  };
}

export async function getBranchesFromDatabase(
  client?: SupabaseClient<Database>,
): Promise<Branch[]> {
  const supabase = client ?? (await createClient());
  await requireAuthenticatedUser(supabase);
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .order("is_main", { ascending: false })
    .order("name");

  if (error) {
    throw new BranchRepositoryError(
      "The branches could not be loaded.",
      error.code,
    );
  }

  return data.map(mapBranch);
}

export async function saveBranchInDatabase(
  input: BranchInput,
  branchId: string | null,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  await requireAuthenticatedUser(supabase);
  const { data, error } = await supabase.rpc("upsert_branch", {
    branch_address: input.address.trim(),
    branch_email: input.email.trim().toLowerCase(),
    branch_google_maps_url: input.googleMapsUrl.trim(),
    branch_name: input.name.trim(),
    branch_phone: input.phone.trim(),
    branch_status: statusToDatabase[input.status],
    branch_time_zone: input.timeZone,
    make_main: input.isMain,
    target_branch_id: branchId,
  });

  if (error || !data) {
    throw new BranchRepositoryError(
      branchErrorMessage(error?.message),
      error?.code,
    );
  }

  return mapBranch(data);
}

export async function deleteBranchFromDatabase(
  branchId: string,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  await requireAuthenticatedUser(supabase);
  const { error } = await supabase.rpc("delete_branch", {
    target_branch_id: branchId,
  });

  if (error) {
    throw new BranchRepositoryError(
      branchErrorMessage(error.message),
      error.code,
    );
  }
}

async function requireAuthenticatedUser(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new BranchRepositoryError("Authentication is required.", "401");
  }
}

function branchErrorMessage(message = "") {
  if (message.includes("BRANCH_NAME_OR_CODE_EXISTS")) {
    return "A branch with this name already exists.";
  }
  if (message.includes("MAIN_BRANCH_REASSIGN_REQUIRED")) {
    return "Assign another branch as main before removing main status.";
  }
  if (message.includes("MAIN_BRANCH_MUST_BE_ACTIVE")) {
    return "The main branch must remain active.";
  }
  if (message.includes("MAIN_BRANCH_DELETE_FORBIDDEN")) {
    return "The main branch cannot be deleted.";
  }
  if (message.includes("BRANCH_DELETE_FORBIDDEN")) {
    return "Only an owner or administrator can delete a branch.";
  }
  if (message.includes("BRANCH_FORBIDDEN")) {
    return "You do not have permission to manage branches.";
  }
  if (message.includes("BRANCH_NOT_FOUND")) {
    return "The branch could not be found.";
  }
  return "The branch could not be saved.";
}
