import type { AppointmentSettings, ScheduleDay, WeekdayIndex } from "@/types/appointment-settings";
import { mockStaffMembers } from "./staff";

const weekdays = [0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[];

export const mockBusinessHours: ScheduleDay[] = weekdays.map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: dayOfWeek !== 0,
  startTime: "09:00",
  endTime: "18:00",
  breakStartTime: "",
  breakEndTime: "",
}));

export const mockAppointmentSettings: AppointmentSettings = {
  id: "appointment-settings-primary",
  general: {
    allowSameDayBookings: true,
    autoConfirmAppointments: false,
    cancellationNoticeValue: 24,
    cancellationNoticeUnit: "Hours",
  },
  businessHours: mockBusinessHours,
  staffSchedules: mockStaffMembers.map((staff) => ({
    staffId: staff.id,
    useCustomHours: true,
    days: weekdays.map((dayOfWeek) => ({
      dayOfWeek,
      isOpen: staff.workingDays.includes(dayOfWeek),
      startTime: "09:00",
      endTime: "18:00",
      breakStartTime: staff.breaks[0]?.startTime ?? "",
      breakEndTime: staff.breaks[0]?.endTime ?? "",
    })),
  })),
  tax: {
    enabled: true,
    type: "Exclusive",
    ratePercent: 10,
    registrationNumber: "",
  },
  updatedAt: "2026-07-18T08:00:00.000Z",
};
