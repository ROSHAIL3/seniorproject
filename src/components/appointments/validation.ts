import type {
  Appointment,
  BookingFormData,
  BookingValidationError,
} from "@/types/appointments";
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
  today: string;
  currentTime?: string;
};

export const validateBooking = (
  draft: BookingFormData,
  context: BookingValidationContext,
  options: { ignoreAppointmentId?: string } = {},
): BookingValidationError[] => {
  const errors: BookingValidationError[] = [];
  const currentTime = context.currentTime ?? "09:00";

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

  if (!service || !staff || !draft.appointmentDate || !draft.startTime) {
    return errors;
  }

  const endTime = addMinutes(draft.startTime, service.durationMinutes);
  const startMinutes = timeToMinutes(draft.startTime);
  const endMinutes = timeToMinutes(endTime);

  if (
    draft.appointmentDate < context.today ||
    (draft.appointmentDate === context.today &&
      startMinutes <= timeToMinutes(currentTime))
  ) {
    errors.push({ code: "past", message: "Appointments cannot be booked in the past." });
  }

  if (
    startMinutes < timeToMinutes(context.businessHours.startTime) ||
    endMinutes > timeToMinutes(context.businessHours.endTime)
  ) {
    errors.push({
      code: "business-hours",
      message: `The selected time is outside business hours (${context.businessHours.startTime}–${context.businessHours.endTime}).`,
    });
  }

  const dayOfWeek = new Date(`${draft.appointmentDate}T00:00:00Z`).getUTCDay();
  if (!staff.workingDays.includes(dayOfWeek)) {
    errors.push({
      code: "staff-day-off",
      message: `${staff.name} is not working on the selected day.`,
    });
  }

  const overlappingBreak = staff.breaks.find((staffBreak) =>
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
      message: `${staff.name} is on break from ${overlappingBreak.startTime} to ${overlappingBreak.endTime}.`,
    });
  }

  const supportsSelection = service.kind === "package"
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
      message: `Staff member has a conflicting appointment at ${staffConflict.startTime}.`,
    });
    errors.push({
      code: "overlap",
      message: `The selected appointment overlaps booking ${staffConflict.bookingNumber}.`,
    });
  }

  const customerConflict = relevantAppointments.find(
    (appointment) =>
      appointment.customerId === draft.customerId &&
      intervalsOverlap(
        draft.startTime,
        endTime,
        appointment.startTime,
        appointment.endTime,
      ),
  );
  if (customerConflict) {
    errors.push({
      code: "customer-conflict",
      message: `Customer has another appointment at ${customerConflict.startTime}.`,
    });
  }

  const nextBlockedTime = getNextBlockedTime(draft, service, staff, context);
  if (nextBlockedTime && endMinutes > timeToMinutes(nextBlockedTime)) {
    errors.push({
      code: "service-duration",
      message: `The ${service.durationMinutes}-minute service exceeds the available time before ${nextBlockedTime}.`,
    });
  }

  return errors.filter(
    (error, index, list) =>
      list.findIndex((candidate) => candidate.code === error.code) === index,
  );
};

const getNextBlockedTime = (
  draft: BookingFormData,
  service: Service,
  staff: StaffMember,
  context: BookingValidationContext,
) => {
  const possibleBoundaries = [
    context.businessHours.endTime,
    ...staff.breaks
      .filter((staffBreak) => staffBreak.startTime >= draft.startTime)
      .map((staffBreak) => staffBreak.startTime),
    ...context.appointments
      .filter(
        (appointment) =>
          appointment.appointmentDate === draft.appointmentDate &&
          appointment.staffId === draft.staffId &&
          appointment.status !== "Cancelled" &&
          appointment.startTime >= draft.startTime,
      )
      .map((appointment) => appointment.startTime),
  ].sort((first, second) => timeToMinutes(first) - timeToMinutes(second));

  const candidate = possibleBoundaries[0];
  return candidate && timeToMinutes(candidate) > timeToMinutes(draft.startTime)
    ? candidate
    : addMinutes(draft.startTime, service.durationMinutes);
};
