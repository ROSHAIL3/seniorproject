import "server-only";

import { mockAppointmentSettings } from "@/data/mock/appointment-settings";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";
import type { AppointmentSettings, ScheduleDay } from "@/types/appointment-settings";
import type { TaxVatSettings } from "@/types/appointment-settings";

export async function getAppointmentSettingsFromDatabase(): Promise<AppointmentSettings> {
  const supabase = await createClient();
  const [
    { data: hours, error },
    { data: schedules },
    { data: memberships },
    { data: financeSettings },
  ] =
    await Promise.all([
      supabase.from("organization_business_hours").select("*").order("day_of_week"),
      supabase.from("staff_schedules").select("*"),
      supabase.from("organization_members").select("id,staff_key"),
      supabase.from("organization_finance_settings").select("*").maybeSingle(),
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
    tax: financeSettings
      ? {
          enabled: financeSettings.vat_enabled,
          ratePercent: Number(financeSettings.vat_rate_percent),
          registrationNumber: financeSettings.vat_registration_number,
          type: financeSettings.vat_type === "inclusive" ? "Inclusive" : "Exclusive",
        }
      : { ...mockAppointmentSettings.tax },
    updatedAt:
      (hours ?? []).reduce(
        (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
        mockAppointmentSettings.updatedAt,
      ),
  };
}

export async function updateFinanceSettingsInDatabase(input: TaxVatSettings) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_finance_settings", {
    target_vat_enabled: input.enabled,
    target_vat_rate_percent: input.ratePercent,
    target_vat_registration_number: input.registrationNumber,
    target_vat_type: input.type === "Inclusive" ? "inclusive" : "exclusive",
  });
  if (error || !data) {
    throw new Error(
      error?.message.includes("SETTINGS_FORBIDDEN")
        ? "You do not have permission to update VAT settings."
        : "VAT settings are invalid.",
    );
  }
  return {
    enabled: data.vat_enabled,
    ratePercent: Number(data.vat_rate_percent),
    registrationNumber: data.vat_registration_number,
    type: data.vat_type === "inclusive" ? "Inclusive" : "Exclusive",
  } satisfies TaxVatSettings;
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
