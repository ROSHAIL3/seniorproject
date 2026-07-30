import type {
  AppointmentSettings,
  GeneralAppointmentSettings,
  ScheduleDay,
  TaxVatSettings,
  WeekdayIndex,
} from "@/types/appointment-settings";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const satisfies readonly WeekdayIndex[];

export const DEFAULT_GENERAL_APPOINTMENT_SETTINGS: GeneralAppointmentSettings = {
  allowSameDayBookings: true,
  autoConfirmAppointments: false,
  cancellationNoticeValue: 24,
  cancellationNoticeUnit: "Hours",
};

export const DEFAULT_TAX_SETTINGS: TaxVatSettings = {
  enabled: true,
  type: "Exclusive",
  ratePercent: 10,
  registrationNumber: "",
};

export function createDefaultBusinessHours(): ScheduleDay[] {
  return WEEKDAYS.map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: dayOfWeek !== 0,
    startTime: "09:00",
    endTime: "18:00",
    breakStartTime: "",
    breakEndTime: "",
  }));
}

export function createDefaultAppointmentSettings(): AppointmentSettings {
  return {
    id: "appointment-settings",
    general: { ...DEFAULT_GENERAL_APPOINTMENT_SETTINGS },
    businessHours: createDefaultBusinessHours(),
    staffSchedules: [],
    tax: { ...DEFAULT_TAX_SETTINGS },
    updatedAt: new Date(0).toISOString(),
  };
}
