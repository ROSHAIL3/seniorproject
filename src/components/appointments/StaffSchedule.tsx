"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import DatePickerControl from "@/components/form/DatePickerControl";
import { ChevronLeftIcon } from "@/icons";
import { getTodayIso } from "@/config/business";
import { formatDisplayDate } from "@/lib/formatters";
import TimeSlot from "./TimeSlot";
import {
  addMinutes,
  type BookingValidationContext,
  minutesToTime,
  timeToMinutes,
  validateStaffInterval,
} from "./validation";
import type { Appointment, BookingValidationError } from "@/types/appointments";
import type { Service } from "@/types/services";
import type { StaffMember } from "@/types/staff";
import { useCurrentInternalPath } from "@/hooks/useGoBack";
import { withReturnTo } from "@/lib/navigation";

type StaffScheduleProps = {
  date: string;
  service: Service | null;
  selectedStaffId: string;
  selectedTime: string;
  selectedCustomerId: string;
  selectedCustomerName: string;
  branchId: string;
  appointments: Appointment[];
  staffMembers: StaffMember[];
  branchNames: Record<string, string>;
  businessHours: { startTime: string; endTime: string };
  validationContext: BookingValidationContext;
  minDate?: string;
  ignoreAppointmentId?: string;
  onDateChange: (date: string) => void;
  onSelectSlot: (staffId: string, time: string) => void;
  onValidationErrors: (errors: BookingValidationError[]) => void;
};

const SLOT_HEIGHT = 44;

const moveDate = (date: string, amount: number) => {
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + amount);
  return nextDate.toISOString().slice(0, 10);
};

export default function StaffSchedule({
  date,
  service,
  selectedStaffId,
  selectedTime,
  selectedCustomerId,
  selectedCustomerName,
  branchId,
  appointments,
  staffMembers,
  branchNames,
  businessHours,
  validationContext,
  minDate,
  ignoreAppointmentId,
  onDateChange,
  onSelectSlot,
  onValidationErrors,
}: StaffScheduleProps) {
  const origin = useCurrentInternalPath();
  const router = useRouter();
  const timeSlots = Array.from(
    {
      length:
        (timeToMinutes(businessHours.endTime) -
          timeToMinutes(businessHours.startTime)) /
        15,
    },
    (_, index) =>
      minutesToTime(timeToMinutes(businessHours.startTime) + index * 15),
  );
  const dayAppointments = appointments.filter(
    (appointment) =>
      appointment.id !== ignoreAppointmentId &&
      appointment.appointmentDate === date &&
      appointment.status !== "Cancelled",
  );
  const selectedEndTime =
    service && selectedTime
      ? addMinutes(selectedTime, service.durationMinutes)
      : "";

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] xl:h-full xl:rounded-none xl:border-0">
      <div className="shrink-0 flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDateChange(moveDate(date, -1))}
            disabled={!!minDate && moveDate(date, -1) < minDate}
            aria-label="Previous day"
            className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(moveDate(date, 1))}
            aria-label="Next day"
            className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronLeftIcon className="size-5 rotate-180" />
          </button>
          <DatePickerControl
            value={date}
            min={minDate}
            allowClear={false}
            ariaLabel="Choose appointment date"
            displayValue={formatDisplayDate}
            onChange={onDateChange}
            className="ml-1 flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-800 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 sm:ml-2 sm:min-w-56 sm:text-base"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDateChange(getTodayIso())}
        >
          Today
        </Button>
      </div>

      <div className="max-w-full overflow-x-auto overscroll-contain xl:min-h-0 xl:flex-1 xl:overflow-auto">
        <div
          className="w-full min-w-max"
          style={{
            display: "grid",
            gridTemplateColumns: `88px repeat(${staffMembers.length}, minmax(170px, 1fr))`,
          }}
        >
          <div className="sticky left-0 top-0 z-40 border-b border-r border-gray-200 bg-gray-100 px-3 py-3 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Time
          </div>
          {staffMembers.map((staff) => (
            <div
              key={staff.id}
              className="sticky top-0 z-30 min-w-0 border-b border-r border-gray-200 bg-gray-100 px-3 py-3 text-center dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="truncate text-sm font-semibold text-gray-950 dark:text-white">
                {staff.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-gray-600 dark:text-gray-300">
                {branchNames[staff.branchId] ?? "Assigned"} branch
              </p>
            </div>
          ))}

          {timeSlots.flatMap((time) => {
            const row = [
              <div
                key={`time-${time}`}
                className="sticky left-0 z-20 flex items-start border-b border-r border-gray-200 bg-white px-3 pt-2 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                style={{ height: SLOT_HEIGHT }}
              >
                {time}
              </div>,
            ];

            staffMembers.forEach((staff) => {
              const startingAppointment = dayAppointments.find(
                (appointment) =>
                  appointment.staffId === staff.id &&
                  appointment.startTime === time,
              );
              const coveringAppointment = dayAppointments.find(
                (appointment) =>
                  appointment.staffId === staff.id &&
                  timeToMinutes(time) > timeToMinutes(appointment.startTime) &&
                  timeToMinutes(time) < timeToMinutes(appointment.endTime),
              );
              const slotErrors: BookingValidationError[] = service
                ? validateStaffInterval(
                    {
                      customerId: selectedCustomerId,
                      serviceId: service.id,
                      staffId: staff.id,
                      branchId,
                      appointmentDate: date,
                      startTime: time,
                    },
                    validationContext,
                    { ignoreAppointmentId },
                  )
                : [
                    {
                      code: "missing-service",
                      message:
                        "Select a service or package before choosing a time.",
                    },
                  ];
              const unavailable = getUnavailablePresentation(slotErrors);
              const isSelectedStaff = selectedStaffId === staff.id;
              const isSelectedPreviewStart =
                isSelectedStaff && selectedTime === time && !!service;
              const isCoveredBySelection =
                isSelectedStaff &&
                !!selectedTime &&
                !!selectedEndTime &&
                timeToMinutes(time) >= timeToMinutes(selectedTime) &&
                timeToMinutes(time) < timeToMinutes(selectedEndTime);
              row.push(
                <div
                  key={`${staff.id}-${time}`}
                  className="relative min-w-0 border-b border-r border-gray-200 dark:border-gray-700"
                  style={{ height: SLOT_HEIGHT }}
                >
                  <TimeSlot
                    time={time}
                    staff={staff}
                    isUnavailable={slotErrors.length > 0 || !!coveringAppointment}
                    unavailableLabel={
                      coveringAppointment
                        ? "Occupied"
                        : unavailable.label
                    }
                    unavailableKind={unavailable.kind}
                    appointment={startingAppointment}
                    appointmentHeight={
                      startingAppointment
                        ? ((timeToMinutes(startingAppointment.endTime) -
                            timeToMinutes(startingAppointment.startTime)) /
                            15) *
                            SLOT_HEIGHT -
                          4
                        : undefined
                    }
                    selectedPreview={
                      isSelectedPreviewStart && service
                        ? {
                            customerName:
                              selectedCustomerName || "Customer not selected",
                            serviceName: service.name,
                            staffName: staff.name,
                            startTime: selectedTime,
                            endTime: selectedEndTime,
                          }
                        : undefined
                    }
                    selectedPreviewHeight={
                      service
                        ? (service.durationMinutes / 15) * SLOT_HEIGHT - 4
                        : undefined
                    }
                    isCoveredBySelection={
                      isCoveredBySelection && !isSelectedPreviewStart
                    }
                    onSelect={() => {
                      if (slotErrors.length > 0) {
                        onValidationErrors(slotErrors);
                        return;
                      }
                      onValidationErrors([]);
                      onSelectSlot(staff.id, time);
                    }}
                    onUnavailableSelect={() =>
                      onValidationErrors(slotErrors)
                    }
                    onOpenAppointment={(appointment) =>
                      router.push(
                        withReturnTo(
                          `/appointments/${appointment.bookingNumber}`,
                          origin,
                        ),
                      )
                    }
                  />
                </div>,
              );
            });

            return row;
          })}
        </div>
      </div>
    </div>
  );
}

function getUnavailablePresentation(errors: BookingValidationError[]) {
  const code = errors[0]?.code;
  if (code === "past") return { label: "Past", kind: "occupied" as const };
  if (code === "staff-break" || code === "business-break") {
    return { label: "Break", kind: "break" as const };
  }
  if (code === "staff-day-off" || code === "staff-hours") {
    return { label: code === "staff-hours" ? "Off shift" : "Day off", kind: "day-off" as const };
  }
  if (code === "branch-conflict") {
    return { label: "Other branch", kind: "other-branch" as const };
  }
  if (code === "staff-service" || code === "missing-service") {
    return { label: code === "missing-service" ? "Choose service" : "Not assigned", kind: "not-assigned" as const };
  }
  if (code === "business-hours") {
    return { label: "Outside hours", kind: "occupied" as const };
  }
  return {
    label: errors.length > 0 ? "Occupied" : undefined,
    kind: "occupied" as const,
  };
}
