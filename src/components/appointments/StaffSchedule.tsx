"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";
import { formatDisplayDate } from "@/lib/formatters";
import TimeSlot from "./TimeSlot";
import {
  intervalsOverlap,
  minutesToTime,
  timeToMinutes,
} from "./validation";
import type { Appointment } from "@/types/appointments";
import type { Service } from "@/types/services";
import type { StaffMember } from "@/types/staff";

type StaffScheduleProps = {
  date: string;
  service: Service | null;
  selectedStaffId: string;
  selectedTime: string;
  branchId: string;
  appointments: Appointment[];
  staffMembers: StaffMember[];
  businessHours: { startTime: string; endTime: string };
  referenceToday: string;
  onDateChange: (date: string) => void;
  onSelectSlot: (staffId: string, time: string) => void;
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
  branchId,
  appointments,
  staffMembers,
  businessHours,
  referenceToday,
  onDateChange,
  onSelectSlot,
}: StaffScheduleProps) {
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
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const dayAppointments = appointments.filter(
    (appointment) =>
      appointment.appointmentDate === date && appointment.status !== "Cancelled",
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDateChange(moveDate(date, -1))}
            aria-label="Previous day"
            className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
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
          <p className="ml-2 text-sm font-medium text-gray-800 dark:text-white/90 sm:text-base">
            {formatDisplayDate(date)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDateChange(referenceToday)}
        >
          Today
        </Button>
      </div>

      <div className="max-w-full overflow-auto">
        <div
          className="min-w-[900px]"
          style={{
            display: "grid",
            gridTemplateColumns: `100px repeat(${staffMembers.length}, minmax(190px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-xs font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900">
            Time
          </div>
          {staffMembers.map((staff) => (
            <div
              key={staff.id}
              className="border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-center dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {staff.name}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {staff.branchId === "branch-manama" ? "Manama" : "Seef"} branch
              </p>
            </div>
          ))}

          {timeSlots.flatMap((time) => {
            const slotEnd = minutesToTime(timeToMinutes(time) + 15);
            const row = [
              <div
                key={`time-${time}`}
                className="sticky left-0 z-10 flex items-start border-b border-r border-gray-200 bg-white px-3 pt-2 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900"
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
              const isDayOff = !staff.workingDays.includes(dayOfWeek);
              const isBreak = staff.breaks.some((staffBreak) =>
                intervalsOverlap(
                  time,
                  slotEnd,
                  staffBreak.startTime,
                  staffBreak.endTime,
                ),
              );
              const wrongBranch = staff.branchId !== branchId;
              const unsupportedService =
                !!service && (service.kind === "package"
                  ? !service.staffIds.includes(staff.id)
                  : !staff.serviceIds.includes(service.id));
              const unavailableLabel = isDayOff
                ? "Day off"
                : isBreak
                  ? "Break"
                  : wrongBranch
                    ? "Other branch"
                    : unsupportedService
                      ? "Not assigned"
                      : coveringAppointment
                        ? ""
                        : undefined;

              row.push(
                <div
                  key={`${staff.id}-${time}`}
                  className="relative border-b border-r border-gray-200 dark:border-gray-800"
                  style={{ height: SLOT_HEIGHT }}
                >
                  <TimeSlot
                    time={time}
                    staff={staff}
                    isSelected={
                      selectedStaffId === staff.id && selectedTime === time
                    }
                    isUnavailable={
                      isDayOff ||
                      isBreak ||
                      wrongBranch ||
                      unsupportedService ||
                      !!coveringAppointment
                    }
                    unavailableLabel={unavailableLabel}
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
                    onSelect={() => onSelectSlot(staff.id, time)}
                    onOpenAppointment={(appointment) =>
                      router.push(
                        `/appointments/${appointment.bookingNumber}`,
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
