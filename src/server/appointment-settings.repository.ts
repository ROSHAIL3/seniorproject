import "server-only";

import { mockAppointmentSettings } from "@/data/mock/appointment-settings";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import type { AppointmentSettings, ScheduleDay } from "@/types/appointment-settings";

export async function getAppointmentSettingsFromDatabase(): Promise<AppointmentSettings> {
  const supabase = await createClient();
  const [{ data: hours, error }, { data: schedules }, { data: memberships }] =
    await Promise.all([
      supabase.from("organization_business_hours").select("*").order("day_of_week"),
      supabase.from("staff_schedules").select("*"),
      supabase.from("organization_members").select("id,staff_key"),
    ]);
  if (error) throw new Error("Appointment settings could not be loaded.");
  const staffKeyByMembership = new Map(
    (memberships ?? []).map((membership) => [membership.id, membership.staff_key]),
  );
  return {
    ...mockAppointmentSettings,
    businessHours: (hours ?? []).map(toScheduleDay),
    staffSchedules: (schedules ?? []).map((schedule) => ({
      days: Array.isArray(schedule.days)
        ? (schedule.days as unknown as ScheduleDay[])
        : [],
      staffId: staffKeyByMembership.get(schedule.membership_id) ?? "",
      useCustomHours: schedule.use_custom_hours,
    })),
    updatedAt:
      (hours ?? []).reduce(
        (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
        mockAppointmentSettings.updatedAt,
      ),
  };
}

export async function updateBusinessHoursInDatabase(days: ScheduleDay[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_business_hours", {
    schedule_days: days as unknown as Json,
  });
  if (error) {
    throw new Error(
      error.message.includes("SETTINGS_FORBIDDEN")
        ? "You do not have permission to update appointment settings."
        : "Business hours are invalid.",
    );
  }
  return data.map(toScheduleDay);
}

function toScheduleDay(
  row: Database["public"]["Tables"]["organization_business_hours"]["Row"],
): ScheduleDay {
  return {
    breakEndTime: row.break_end_time?.slice(0, 5) ?? "",
    breakStartTime: row.break_start_time?.slice(0, 5) ?? "",
    dayOfWeek: row.day_of_week as ScheduleDay["dayOfWeek"],
    endTime: row.end_time.slice(0, 5),
    isOpen: row.is_open,
    startTime: row.start_time.slice(0, 5),
  };
}
