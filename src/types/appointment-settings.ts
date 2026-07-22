export type CancellationNoticeUnit = "Minutes" | "Hours" | "Days";
export type VatType = "Exclusive" | "Inclusive";
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleDay = {
  dayOfWeek: WeekdayIndex;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
};

export type GeneralAppointmentSettings = {
  allowSameDayBookings: boolean;
  autoConfirmAppointments: boolean;
  cancellationNoticeValue: number;
  cancellationNoticeUnit: CancellationNoticeUnit;
};

export type StaffScheduleSettings = {
  staffId: string;
  useCustomHours: boolean;
  days: ScheduleDay[];
};

export type TaxVatSettings = {
  enabled: boolean;
  type: VatType;
  ratePercent: number;
  registrationNumber: string;
};

export type AppointmentSettings = {
  id: string;
  general: GeneralAppointmentSettings;
  businessHours: ScheduleDay[];
  staffSchedules: StaffScheduleSettings[];
  tax: TaxVatSettings;
  updatedAt: string;
};

export type MoneyTaxBreakdown = {
  subtotalBhd: number;
  vatBhd: number;
  totalBhd: number;
};
