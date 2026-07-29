import { NextResponse } from "next/server";
import {
  disableTeamMemberInDatabase,
  getTeamMemberFromDatabase,
  updateTeamMemberInDatabase,
} from "@/server/team-members.repository";
import { validateTeamMember } from "@/services/team-members.service";
import type { TeamMemberInput } from "@/types/team-members";

type Context = { params: Promise<{ staffKey: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { staffKey } = await context.params;
    const member = await getTeamMemberFromDatabase(staffKey);
    if (!member) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ member });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const input = (await request.json().catch(() => ({}))) as TeamMemberInput;
  const fieldErrors = validateTeamMember(input);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ fieldErrors }, { status: 400 });
  }
  try {
    const { staffKey } = await context.params;
    const member = await updateTeamMemberInDatabase(staffKey, input);
    return NextResponse.json({ member });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { staffKey } = await context.params;
    await disableTeamMemberInDatabase(staffKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 400 },
  );
}
