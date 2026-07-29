import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { StaffScheduleSettings } from "@/types/appointment-settings";

type Context = { params: Promise<{ staffKey: string }> };

export async function GET(_request: Request, context: Context) {
  const supabase = await createClient();
  const { staffKey } = await context.params;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id, organization_id")
    .eq("staff_key", staffKey)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("staff_schedules")
    .select("*")
    .eq("membership_id", membership.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    schedule: data
      ? {
          days: data.days,
          staffId: staffKey,
          useCustomHours: data.use_custom_hours,
        }
      : null,
  });
}

export async function PUT(request: Request, context: Context) {
  const input = (await request.json().catch(() => ({}))) as StaffScheduleSettings;
  if (!isValidSchedule(input)) {
    return NextResponse.json(
      { error: "The staff schedule is invalid." },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const { staffKey } = await context.params;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id, organization_id")
    .eq("staff_key", staffKey)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("staff_schedules")
    .upsert(
      {
        days: input.days as unknown as Json,
        membership_id: membership.id,
        organization_id: membership.organization_id,
        use_custom_hours: input.useCustomHours,
      },
      { onConflict: "organization_id,membership_id" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    schedule: {
      days: data.days,
      staffId: staffKey,
      useCustomHours: data.use_custom_hours,
    },
  });
}

function isValidSchedule(input: StaffScheduleSettings) {
  if (
    typeof input?.useCustomHours !== "boolean" ||
    !Array.isArray(input?.days) ||
    input.days.length > 7
  ) {
    return false;
  }
  const seen = new Set<number>();
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  return input.days.every((day) => {
    if (
      !Number.isInteger(day.dayOfWeek) ||
      day.dayOfWeek < 0 ||
      day.dayOfWeek > 6 ||
      seen.has(day.dayOfWeek)
    ) {
      return false;
    }
    seen.add(day.dayOfWeek);
    return (
      typeof day.isOpen === "boolean" &&
      [day.startTime, day.endTime, day.breakStartTime, day.breakEndTime].every(
        (value) => value === "" || timePattern.test(value),
      )
    );
  });
}
