import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActivityLogsFromDatabase } from "@/server/activity-log.repository";
import type { Json } from "@/types/database";
import type { ActivityLogInput } from "@/types/activity-log";

export async function GET() {
  try {
    return NextResponse.json({ logs: await getActivityLogsFromDatabase() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activity logs could not be loaded." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as ActivityLogInput;
  if (!input.action || !input.category) {
    return NextResponse.json({ error: "Action and category are required." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_client_activity", {
    activity_action: input.action,
    activity_category: input.category,
    activity_description: input.description ?? "",
    activity_metadata: (input.metadata ?? {}) as unknown as Json,
    activity_new_values: (input.newValues ?? null) as unknown as Json,
    activity_old_values: (input.oldValues ?? null) as unknown as Json,
    activity_source: input.source ?? "",
    activity_target_id: input.targetId ?? "",
    activity_target_type: input.targetType ?? "",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data }, { status: 201 });
}
