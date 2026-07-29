import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTeamMemberFromDatabase } from "@/server/team-members.repository";

type Context = { params: Promise<{ staffKey: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const supabase = await createClient();
    const { data: allowed } = await supabase.rpc("has_module_permission", {
      action_name: "edit",
      module_name: "Team Members",
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "You do not have permission to create recovery links." },
        { status: 403 },
      );
    }

    const { staffKey } = await context.params;
    const member = await getTeamMemberFromDatabase(staffKey, supabase);
    if (!member) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const admin = createAdminClient();
    const origin = new URL(request.url).origin;
    const { data, error } = await admin.auth.admin.generateLink({
      email: member.email,
      options: { redirectTo: `${origin}/auth/confirm?next=/set-password` },
      type: "recovery",
    });
    if (error || !data.properties.action_link) {
      throw new Error(error?.message ?? "Recovery link generation failed.");
    }
    return NextResponse.json({ recoveryLink: data.properties.action_link });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 400 },
    );
  }
}
