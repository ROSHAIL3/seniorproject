import { mockAppointmentSettings } from "@/data/mock/appointment-settings";
import { getStaffMemberById } from "@/services/staff.service";
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

const settings = cloneSettings(mockAppointmentSettings);
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
  return cloneSettings(settings);
}

export async function updateGeneralAppointmentSettings(input: GeneralAppointmentSettings) {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.cancellationNoticeValue) || input.cancellationNoticeValue < 0) {
    errors.cancellationNoticeValue = "Cancellation notice must be zero or greater.";
  }
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const previous = { ...settings.general };
  settings.general = { ...input };
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
  const previous = cloneDays(settings.businessHours);
  settings.businessHours = cloneDays(days);
  stamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Business hours changed", category: "Settings", targetType: "business hours", targetId: settings.id, description: "Updated weekly business hours.", metadata: { daysChanged: days.length }, oldValues: { days: previous }, newValues: { days: settings.businessHours }, source: "appointment-settings" });
  return cloneDays(settings.businessHours);
}

export async function getStaffSchedule(staffId: string): Promise<StaffScheduleSettings> {
  const staff = await getStaffMemberById(staffId);
  if (!staff) throw new Error("The selected staff member could not be found.");
  const existing = settings.staffSchedules.find((schedule) => schedule.staffId === staffId);
  if (existing) return { ...existing, days: cloneDays(existing.days) };
  return { staffId, useCustomHours: false, days: cloneDays(settings.businessHours) };
}

export async function updateStaffSchedule(input: StaffScheduleSettings) {
  const staff = await getStaffMemberById(input.staffId);
  if (!staff) throw new Error("The selected staff member could not be found.");
  const days = input.useCustomHours ? input.days : settings.businessHours;
  const errors = validateScheduleDays(days);
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const next = { ...input, days: cloneDays(days) };
  const index = settings.staffSchedules.findIndex((schedule) => schedule.staffId === input.staffId);
  const previous = index >= 0 ? { ...settings.staffSchedules[index], days: cloneDays(settings.staffSchedules[index].days) } : undefined;
  if (index >= 0) settings.staffSchedules[index] = next;
  else settings.staffSchedules.push(next);
  stamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Staff schedule changed", category: "Catalog & Team", targetType: "staff schedule", targetId: input.staffId, description: `Updated the staff schedule for ${staff.name}.`, metadata: { staff: staff.name }, oldValues: previous ? { useCustomHours: previous.useCustomHours, days: previous.days } : undefined, newValues: { useCustomHours: next.useCustomHours, days: next.days }, source: "appointment-settings" });
  return { ...next, days: cloneDays(next.days) };
}

export async function updateTaxVatSettings(input: TaxVatSettings) {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.ratePercent) || input.ratePercent < 0 || input.ratePercent > 100) {
    errors.ratePercent = "VAT rate must be between 0 and 100.";
  }
  if (Object.keys(errors).length) throw new AppointmentSettingsValidationError(errors);
  const previous = { ...settings.tax };
  settings.tax = { ...input, registrationNumber: input.registrationNumber.trim() };
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
