import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createDefaultPermissions } from "@/lib/team-member-permissions";
import type { Database, Json } from "@/types/database";
import type {
  PermissionSet,
  TeamMember,
  TeamMemberInput,
  TeamMemberRole,
  TeamMemberStatus,
} from "@/types/team-members";

type MembershipRow =
  Database["public"]["Tables"]["organization_members"]["Row"];

const roleFromDatabase: Record<MembershipRow["role"], TeamMemberRole> = {
  accountant: "Accountant",
  admin: "Admin",
  manager: "Manager",
  owner: "Owner",
  staff: "Staff",
};

const roleToDatabase = {
  Accountant: "accountant",
  Admin: "admin",
  Manager: "manager",
  Owner: "owner",
  Staff: "staff",
} as const;

const statusFromDatabase: Record<MembershipRow["status"], TeamMemberStatus> = {
  active: "Active",
  disabled: "Inactive",
  invited: "Invited",
};

export class TeamRepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function getTeamMembersFromDatabase(
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new TeamRepositoryError("Authentication is required.", "401");
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("*")
    .order("created_at");

  if (error) {
    throw new TeamRepositoryError("Team members could not be loaded.", error.code);
  }
  if (!memberships.length) return [];

  const userIds = memberships.map((membership) => membership.user_id);
  const membershipIds = memberships.map((membership) => membership.id);
  const [{ data: profiles }, { data: schedules }] = await Promise.all([
    supabase.from("profiles").select("*").in("user_id", userIds),
    supabase
      .from("staff_schedules")
      .select("*")
      .in("membership_id", membershipIds),
  ]);

  const profileByUser = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile]),
  );
  const scheduleByMembership = new Map(
    (schedules ?? []).map((schedule) => [schedule.membership_id, schedule]),
  );

  return memberships.map((membership) => {
    const profile = profileByUser.get(membership.user_id);
    const schedule = scheduleByMembership.get(membership.id);
    const days = Array.isArray(schedule?.days)
      ? (schedule.days as unknown as ScheduleDayRecord[])
      : [];
    const workingDays = days
      .filter((day) => day.isOpen)
      .map((day) => day.dayOfWeek);
    const breaks = days
      .filter((day) => day.breakStartTime && day.breakEndTime)
      .map((day) => ({
        startTime: day.breakStartTime,
        endTime: day.breakEndTime,
      }))
      .filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.startTime === item.startTime &&
              candidate.endTime === item.endTime,
          ) === index,
      );

    return {
      branchId: membership.primary_branch_id ?? "",
      breaks,
      createdAt: membership.created_at,
      email: profile?.email ?? "",
      fullName: profile?.full_name || profile?.email || "Team Member",
      id: membership.staff_key,
      lastActiveAt: membership.last_active_at,
      permissions:
        membership.role === "owner"
          ? createDefaultPermissions(true)
          : normalizePermissions(membership.permissions),
      phone: profile?.phone ?? "",
      photoUrl: profile?.avatar_url ?? "",
      role: roleFromDatabase[membership.role],
      serviceIds: [...membership.service_ids],
      status: statusFromDatabase[membership.status],
      workingDays: workingDays.length ? workingDays : [1, 2, 3, 4, 5, 6],
    } satisfies TeamMember;
  });
}

export async function getTeamMemberFromDatabase(
  staffKey: string,
  client?: SupabaseClient<Database>,
) {
  const members = await getTeamMembersFromDatabase(client);
  return members.find((member) => member.id === staffKey) ?? null;
}

export async function updateTeamMemberInDatabase(
  staffKey: string,
  input: TeamMemberInput,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("update_team_membership", {
    member_branch_id: input.branchId,
    member_full_name: input.fullName.trim(),
    member_permissions: input.permissions as unknown as Json,
    member_phone: input.phone.trim(),
    member_role: roleToDatabase[input.role],
    member_service_ids: input.serviceIds,
    member_status:
      input.status === "Inactive"
        ? "disabled"
        : input.status === "Invited"
          ? "invited"
          : "active",
    target_staff_key: staffKey,
  });

  if (error || !data) {
    throw new TeamRepositoryError(teamErrorMessage(error?.message), error?.code);
  }

  return getTeamMemberFromDatabase(staffKey, supabase);
}

export async function disableTeamMemberInDatabase(
  staffKey: string,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const { error } = await supabase.rpc("disable_team_membership", {
    target_staff_key: staffKey,
  });
  if (error) {
    throw new TeamRepositoryError(teamErrorMessage(error.message), error.code);
  }
}

export function teamErrorMessage(message = "") {
  if (message.includes("TEAM_EMAIL_EXISTS")) {
    return "A team member with this email already exists.";
  }
  if (message.includes("LAST_OWNER_REQUIRED")) {
    return "There must always be at least one active Owner.";
  }
  if (message.includes("OWNER_MUST_BE_ACTIVE")) {
    return "An Owner cannot be deactivated.";
  }
  if (message.includes("OWNER_ROLE_FORBIDDEN")) {
    return "Only an Owner can manage another Owner.";
  }
  if (message.includes("OWNER_REMOVE_FORBIDDEN")) {
    return "The business Owner cannot be removed.";
  }
  if (message.includes("TEAM_BRANCH_INVALID")) {
    return "Select an active branch in this organization.";
  }
  if (message.includes("TEAM_MEMBER_NOT_FOUND")) {
    return "The team member could not be found.";
  }
  if (message.includes("TEAM_MANAGE_FORBIDDEN")) {
    return "You do not have permission to manage team members.";
  }
  return "The team member could not be updated.";
}

function normalizePermissions(value: Json): PermissionSet {
  const defaults = createDefaultPermissions(false);
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;

  for (const [module, actions] of Object.entries(value)) {
    if (!(module in defaults) || !actions || typeof actions !== "object") continue;
    for (const [action, enabled] of Object.entries(actions)) {
      if (action in defaults[module as keyof PermissionSet]) {
        defaults[module as keyof PermissionSet][
          action as keyof PermissionSet[keyof PermissionSet]
        ] = enabled === true;
      }
    }
  }
  return defaults;
}

type ScheduleDayRecord = {
  breakEndTime: string;
  breakStartTime: string;
  dayOfWeek: number;
  endTime: string;
  isOpen: boolean;
  startTime: string;
};
