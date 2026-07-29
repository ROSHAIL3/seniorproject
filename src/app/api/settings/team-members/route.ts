import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createDefaultPermissions } from "@/lib/team-member-permissions";
import {
  getTeamMemberFromDatabase,
  getTeamMembersFromDatabase,
  teamErrorMessage,
} from "@/server/team-members.repository";
import { validateTeamMember } from "@/services/team-members.service";
import type { Json } from "@/types/database";
import type { TeamMemberCreateInput } from "@/types/team-members";

const roles = {
  Accountant: "accountant",
  Admin: "admin",
  Manager: "manager",
  Owner: "owner",
  Staff: "staff",
} as const;

export async function GET() {
  try {
    return NextResponse.json({
      members: await getTeamMembersFromDatabase(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as TeamMemberCreateInput;
  const fieldErrors = validateTeamMember(input);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ fieldErrors }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: permission, error: permissionError } = await supabase.rpc(
    "has_module_permission",
    { action_name: "create", module_name: "Team Members" },
  );
  if (permissionError || !permission) {
    return NextResponse.json(
      { error: "You do not have permission to invite team members." },
      { status: 403 },
    );
  }

  let invitedUserId: string | undefined;
  try {
    const admin = createAdminClient();
    const origin = new URL(request.url).origin;
    const { data, error } = await admin.auth.admin.generateLink({
      email: input.email.trim().toLowerCase(),
      options: {
        data: { full_name: input.fullName.trim() },
        redirectTo: `${origin}/auth/confirm?next=/set-password`,
      },
      type: "invite",
    });
    if (error || !data.user || !data.properties.action_link) {
      throw new Error(
        error?.message ?? "The invitation link could not be generated.",
      );
    }
    invitedUserId = data.user.id;

    const { data: membership, error: membershipError } = await supabase.rpc(
      "create_team_membership",
      {
        invited_user_id: data.user.id,
        member_branch_id: input.branchId,
        member_email: input.email.trim().toLowerCase(),
        member_full_name: input.fullName.trim(),
        member_permissions: (input.permissions ??
          createDefaultPermissions(false)) as unknown as Json,
        member_phone: input.phone.trim(),
        member_role: roles[input.role],
        member_service_ids: input.serviceIds,
      },
    );
    if (membershipError || !membership) {
      await admin.auth.admin.deleteUser(data.user.id);
      invitedUserId = undefined;
      throw new Error(teamErrorMessage(membershipError?.message));
    }

    const member = await getTeamMemberFromDatabase(
      membership.staff_key,
      supabase,
    );
    if (!member) throw new Error("The invited team member could not be loaded.");

    return NextResponse.json(
      { inviteLink: data.properties.action_link, member },
      { status: 201 },
    );
  } catch (error) {
    if (invitedUserId) {
      try {
        await createAdminClient().auth.admin.deleteUser(invitedUserId);
      } catch {
        // The membership transaction already failed; cleanup is best effort.
      }
    }
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "The team member request failed.";
  const duplicate = message.toLowerCase().includes("already");
  return NextResponse.json(
    duplicate
      ? { error: message, fieldErrors: { email: message } }
      : { error: message },
    { status: duplicate ? 409 : 400 },
  );
}
