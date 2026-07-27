import type {
  Appointment,
  BookingFormData,
  BookingValidationError,
} from "@/types/appointments";
import type { AppointmentSettings, ScheduleDay } from "@/types/appointment-settings";
import type { Service } from "@/types/services";
import type { StaffMember } from "@/types/staff";

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const addMinutes = (time: string, duration: number) =>
  minutesToTime(timeToMinutes(time) + duration);

export const intervalsOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) =>
  timeToMinutes(firstStart) < timeToMinutes(secondEnd) &&
  timeToMinutes(firstEnd) > timeToMinutes(secondStart);

export type BookingValidationContext = {
  appointments: Appointment[];
  services: Service[];
  staffMembers: StaffMember[];
  businessHours: { startTime: string; endTime: string };
  appointmentSettings?: AppointmentSettings;
  today: string;
  currentTime?: string;
};

type ValidationOptions = {
  ignoreAppointmentId?: string;
};

export const validateBooking = (
  draft: BookingFormData,
  context: BookingValidationContext,
  options: ValidationOptions = {},
): BookingValidationError[] => {
  const errors: BookingValidationError[] = [];

  if (!draft.customerId) {
    errors.push({
      code: "missing-customer",
      message: "Select a customer before saving the appointment.",
    });
  }

  const service = context.services.find((item) => item.id === draft.serviceId);
  if (!draft.serviceId || !service) {
    errors.push({
      code: "missing-service",
      message: "Select a service or package before saving.",
    });
  }

  const staff = context.staffMembers.find((item) => item.id === draft.staffId);
  if (!draft.staffId || !staff) {
    errors.push({
      code: "missing-staff",
      message: "Select a staff member from the schedule.",
    });
  }

  if (!draft.appointmentDate || !draft.startTime) {
    errors.push({
      code: "missing-date-time",
      message: "Select an appointment date and start time.",
    });
  }

  if (service && staff && draft.appointmentDate && draft.startTime) {
    errors.push(...validateStaffInterval(draft, context, options));
  }

  return deduplicateErrors(errors);
};

export const validateStaffInterval = (
  draft: BookingFormData,
  context: BookingValidationContext,
  options: ValidationOptions = {},
): BookingValidationError[] => {
  const service = context.services.find((item) => item.id === draft.serviceId);
  const staff = context.staffMembers.find((item) => item.id === draft.staffId);
  if (!service || !staff || !draft.appointmentDate || !draft.startTime) {
    return [];
  }

  const errors: BookingValidationError[] = [];
  const endTime = addMinutes(draft.startTime, service.durationMinutes);
  const startMinutes = timeToMinutes(draft.startTime);
  const endMinutes = timeToMinutes(endTime);
  const currentTime = context.currentTime ?? "09:00";
  const dayOfWeek = new Date(
    `${draft.appointmentDate}T00:00:00Z`,
  ).getUTCDay();
  const businessDay = context.appointmentSettings?.businessHours.find(
    (day) => day.dayOfWeek === dayOfWeek,
  );
  const staffDay = resolveStaffDay(
    staff.id,
    dayOfWeek,
    businessDay,
    context.appointmentSettings,
  );

  if (
    draft.appointmentDate < context.today ||
    (draft.appointmentDate === context.today &&
      startMinutes <= timeToMinutes(currentTime))
  ) {
    errors.push({
      code: "past",
      message: "The selected start time is in the past.",
    });
  }

  if (businessDay && !businessDay.isOpen) {
    errors.push({
      code: "business-hours",
      message: "The business is closed on the selected day.",
    });
  } else {
    const businessStart = businessDay?.startTime ?? context.businessHours.startTime;
    const businessEnd = businessDay?.endTime ?? context.businessHours.endTime;
    if (
      startMinutes < timeToMinutes(businessStart) ||
      endMinutes > timeToMinutes(businessEnd)
    ) {
      errors.push({
        code: "business-hours",
        message: `The full ${service.durationMinutes}-minute service must stay within business hours (${businessStart}–${businessEnd}).`,
      });
    }
  }

  const worksSelectedDay = staffDay
    ? staffDay.isOpen
    : staff.workingDays.includes(dayOfWeek);
  if (!worksSelectedDay) {
    errors.push({
      code: "staff-day-off",
      message: `${staff.name} is not working on the selected day.`,
    });
  } else if (staffDay) {
    if (
      startMinutes < timeToMinutes(staffDay.startTime) ||
      endMinutes > timeToMinutes(staffDay.endTime)
    ) {
      errors.push({
        code: "staff-hours",
        message: `${staff.name} works from ${staffDay.startTime} to ${staffDay.endTime}; the service must finish before the staff leaving time.`,
      });
    }
  }

  const breaks = resolveStaffBreaks(staff, staffDay);
  const overlappingBreak = breaks.find((staffBreak) =>
    intervalsOverlap(
      draft.startTime,
      endTime,
      staffBreak.startTime,
      staffBreak.endTime,
    ),
  );
  if (overlappingBreak) {
    errors.push({
      code: "staff-break",
      message: `${staff.name} is on break from ${overlappingBreak.startTime} to ${overlappingBreak.endTime}; the full service cannot overlap that break.`,
    });
  }

  const supportsSelection =
    service.kind === "package"
      ? service.staffIds.includes(staff.id)
      : staff.serviceIds.includes(service.id);
  if (!supportsSelection) {
    errors.push({
      code: "staff-service",
      message: `${staff.name} is not assigned to ${service.name}.`,
    });
  }

  if (staff.branchId !== draft.branchId) {
    errors.push({
      code: "branch-conflict",
      message: `${staff.name} is assigned to a different branch.`,
    });
  }

  const relevantAppointments = context.appointments.filter(
    (appointment) =>
      appointment.id !== options.ignoreAppointmentId &&
      appointment.appointmentDate === draft.appointmentDate &&
      appointment.status !== "Cancelled",
  );

  const staffConflict = relevantAppointments.find(
    (appointment) =>
      appointment.staffId === staff.id &&
      intervalsOverlap(
        draft.startTime,
        endTime,
        appointment.startTime,
        appointment.endTime,
      ),
  );
  if (staffConflict) {
    errors.push({
      code: "staff-conflict",
      message: `${staff.name} already has booking ${staffConflict.bookingNumber} from ${staffConflict.startTime} to ${staffConflict.endTime}.`,
    });
  }

  const customerConflict = draft.customerId
    ? relevantAppointments.find(
        (appointment) =>
          appointment.customerId === draft.customerId &&
          intervalsOverlap(
            draft.startTime,
            endTime,
            appointment.startTime,
            appointment.endTime,
          ),
      )
    : undefined;
  if (customerConflict) {
    errors.push({
      code: "customer-conflict",
      message: `The selected customer already has booking ${customerConflict.bookingNumber} from ${customerConflict.startTime} to ${customerConflict.endTime}.`,
    });
  }

  return deduplicateErrors(errors);
};

function resolveStaffDay(
  staffId: string,
  dayOfWeek: number,
  businessDay: ScheduleDay | undefined,
  settings: AppointmentSettings | undefined,
) {
  const schedule = settings?.staffSchedules.find(
    (item) => item.staffId === staffId,
  );
  if (!schedule) return undefined;
  if (!schedule?.useCustomHours) return businessDay;
  return schedule.days.find((day) => day.dayOfWeek === dayOfWeek);
}

function resolveStaffBreaks(
  staff: StaffMember,
  staffDay: ScheduleDay | undefined,
) {
  if (staffDay) {
    return staffDay.breakStartTime && staffDay.breakEndTime
      ? [
          {
            startTime: staffDay.breakStartTime,
            endTime: staffDay.breakEndTime,
          },
        ]
      : [];
  }
  return staff.breaks;
}

function deduplicateErrors(errors: BookingValidationError[]) {
  return errors.filter(
    (error, index, list) =>
      list.findIndex((candidate) => candidate.code === error.code) === index,
  );
}
