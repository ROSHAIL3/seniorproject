import { createDefaultAppointmentSettings } from "@/config/appointment-defaults";
import type {
  AppointmentSettings,
  GeneralAppointmentSettings,
  MoneyTaxBreakdown,
  ScheduleDay,
  StaffScheduleSettings,
  TaxVatSettings,
} from "@/types/appointment-settings";
import type { VatTreatment } from "@/types/expenses";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

export class AppointmentSettingsValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Please correct the highlighted settings.");
  }
}

const settings = createDefaultAppointmentSettings();
const listeners = new Set<() => void>();

function cloneDays(days: ScheduleDay[]) {
  return days.map((day) => ({ ...day }));
}

function cloneSettings(value: AppointmentSettings): AppointmentSettings {
  return {
    ...value,
    general: { ...value.general },
    businessHours: cloneDays(value.businessHours),
    staffSchedules: value.staffSchedules.map((schedule) => ({
      ...schedule,
      days: cloneDays(schedule.days),
    })),
    tax: { ...value.tax },
  };
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function stamp() {
  settings.updatedAt = new Date().toISOString();
  emitChange();
}

export function subscribeToAppointmentSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getAppointmentSettings() {
  const response = await fetch("/api/settings/appointment-settings", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Appointment settings could not be loaded.");
  const loaded = cloneSettings(body.settings as AppointmentSettings);
  settings.businessHours = cloneDays(loaded.businessHours);
  settings.staffSchedules = loaded.staffSchedules.map((schedule) => ({
    ...schedule,
    days: cloneDays(schedule.days),
  }));
  settings.tax = { ...loaded.tax };
  settings.updatedAt = loaded.updatedAt;
  return loaded;
}

export async function updateGeneralAppointmentSettings(input: GeneralAppointmentSettings) {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.cancellationNoticeValue) || input.cancellationNoticeValue < 0) {
    errors.cancellationNoticeValue = "Cancellation notice must be zero or greater.";
  }
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const response = await fetch("/api/settings/appointment-settings", {
    body: JSON.stringify({ general: input }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "General appointment settings could not be saved.");
  }
  const previous = { ...settings.general };
  settings.general = { ...(body.general as GeneralAppointmentSettings) };
  stamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Appointment settings changed", category: "Settings", targetType: "appointment settings", targetId: settings.id, description: "Updated general appointment settings.", metadata: {}, oldValues: previous, newValues: settings.general, source: "appointment-settings" });
  return { ...settings.general };
}

export function validateScheduleDays(days: ScheduleDay[]) {
  const errors: Record<string, string> = {};
  for (const day of days) {
    if (!day.isOpen) continue;
    const prefix = `day-${day.dayOfWeek}`;
    const start = timeToMinutes(day.startTime);
    const end = timeToMinutes(day.endTime);
    if (start === null || end === null || end <= start) {
      errors[prefix] = "End time must be after start time.";
      continue;
    }
    const hasBreakStart = Boolean(day.breakStartTime);
    const hasBreakEnd = Boolean(day.breakEndTime);
    if (hasBreakStart !== hasBreakEnd) {
      errors[prefix] = "Enter both break start and break end times.";
      continue;
    }
    if (hasBreakStart && hasBreakEnd) {
      const breakStart = timeToMinutes(day.breakStartTime);
      const breakEnd = timeToMinutes(day.breakEndTime);
      if (breakStart === null || breakEnd === null || breakEnd <= breakStart || breakStart < start || breakEnd > end) {
        errors[prefix] = "Break time must be inside working hours.";
      }
    }
  }
  return errors;
}

export async function updateBusinessHours(days: ScheduleDay[]) {
  const errors = validateScheduleDays(days);
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const response = await fetch("/api/settings/appointment-settings", {
    body: JSON.stringify({ businessHours: days }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Business hours could not be saved.");
  const previous = cloneDays(settings.businessHours);
  settings.businessHours = cloneDays(body.businessHours as ScheduleDay[]);
  stamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Business hours changed", category: "Settings", targetType: "business hours", targetId: settings.id, description: "Updated weekly business hours.", metadata: { daysChanged: days.length }, oldValues: { days: previous }, newValues: { days: settings.businessHours }, source: "appointment-settings" });
  return cloneDays(settings.businessHours);
}

export async function getStaffSchedule(staffId: string): Promise<StaffScheduleSettings> {
  const response = await fetch(`/api/settings/team-members/${encodeURIComponent(staffId)}/schedule`, { cache: "no-store" });
  if (!response.ok) throw new Error("The staff schedule could not be loaded.");
  const body = await response.json();
  if (!body.schedule) return { staffId, useCustomHours: false, days: cloneDays(settings.businessHours) };
  return { ...body.schedule, days: cloneDays(body.schedule.days) };
}

export async function updateStaffSchedule(input: StaffScheduleSettings) {
  const days = input.useCustomHours ? input.days : settings.businessHours;
  const errors = validateScheduleDays(days);
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const response = await fetch(`/api/settings/team-members/${encodeURIComponent(input.staffId)}/schedule`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, days }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "The staff schedule could not be saved.");
  return { ...body.schedule, days: cloneDays(body.schedule.days) };
}

export async function updateTaxVatSettings(input: TaxVatSettings) {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.ratePercent) || input.ratePercent < 0 || input.ratePercent > 100) {
    errors.ratePercent = "VAT rate must be between 0 and 100.";
  }
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const response = await fetch("/api/settings/appointment-settings", {
    body: JSON.stringify({ tax: input }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "VAT settings could not be saved.");
  const previous = { ...settings.tax };
  settings.tax = { ...(body.tax as TaxVatSettings) };
  stamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "VAT settings changed", category: "Settings", targetType: "VAT settings", targetId: settings.id, description: "Updated VAT configuration.", metadata: {}, oldValues: previous, newValues: settings.tax, source: "appointment-settings" });
  return { ...settings.tax };
}

export function calculateTax(amountBhd: number, tax: TaxVatSettings): MoneyTaxBreakdown {
  const amount = Math.max(0, amountBhd);
  const rate = tax.enabled ? Math.max(0, tax.ratePercent) / 100 : 0;
  if (!rate) return { subtotalBhd: amount, vatBhd: 0, totalBhd: amount };
  if (tax.type === "Inclusive") {
    const subtotalBhd = amount / (1 + rate);
    return { subtotalBhd, vatBhd: amount - subtotalBhd, totalBhd: amount };
  }
  const vatBhd = amount * rate;
  return { subtotalBhd: amount, vatBhd, totalBhd: amount + vatBhd };
}

export function calculateExpenseInputVat(amountBhd: number, treatment: VatTreatment, tax: TaxVatSettings) {
  if (treatment === "No VAT" || !tax.enabled) return 0;
  const normalizedTax = { ...tax, type: treatment === "VAT Included" ? "Inclusive" as const : "Exclusive" as const };
  return calculateTax(amountBhd, normalizedTax).vatBhd;
}

function timeToMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
