"use client";

import type { Appointment, AppointmentStatus } from "@/types/appointments";
import type { StaffMember } from "@/types/staff";
import { positionAppointments, timeToMinutes } from "./calendarLayout";

type DayTimelineProps = {
  appointments: Appointment[];
  staffMembers: StaffMember[];
  selectedStaffId: string;
  onAppointmentClick: (appointment: Appointment) => void;
};

const PIXELS_PER_MINUTE = 1.8;
const DEFAULT_START_MINUTES = 8 * 60;
const DEFAULT_END_MINUTES = 20 * 60;

const statusClasses: Record<AppointmentStatus, string> = {
  Booked:
    "border-brand-300 bg-brand-50 text-gray-900 dark:border-brand-500/50 dark:bg-brand-500/20 dark:text-white",
  Confirmed:
    "border-success-300 bg-success-50 text-gray-900 dark:border-success-500/50 dark:bg-success-500/20 dark:text-white",
  Completed:
    "border-success-300 bg-success-50 text-gray-900 dark:border-success-500/50 dark:bg-success-500/20 dark:text-white",
  Cancelled:
    "border-error-300 bg-error-50 text-gray-900 dark:border-error-500/50 dark:bg-error-500/20 dark:text-white",
  "No Show":
    "border-orange-300 bg-orange-50 text-gray-900 dark:border-orange-500/50 dark:bg-orange-500/20 dark:text-white",
};

function formatHour(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:00 ${suffix}`;
}

export default function DayTimeline({
  appointments,
  staffMembers,
  selectedStaffId,
  onAppointmentClick,
}: DayTimelineProps) {
  const visibleStaff = (() => {
    if (selectedStaffId !== "all") {
      const selected = staffMembers.find(
        (member) => member.id === selectedStaffId,
      );
      if (selected) return [selected];
      const appointment = appointments.find(
        (item) => item.staffId === selectedStaffId,
      );
      return appointment
        ? [
            {
              id: appointment.staffId,
              name: appointment.staffName,
            } as StaffMember,
          ]
        : [];
    }

    const staffById = new Map(
      staffMembers.map((member) => [member.id, member]),
    );
    appointments.forEach((appointment) => {
      if (!staffById.has(appointment.staffId)) {
        staffById.set(appointment.staffId, {
          id: appointment.staffId,
          name: appointment.staffName,
        } as StaffMember);
      }
    });
    return [...staffById.values()];
  })();

  const appointmentTimes = appointments.flatMap((appointment) => [
    timeToMinutes(appointment.startTime),
    timeToMinutes(appointment.endTime),
  ]);
  const startMinutes = Math.min(DEFAULT_START_MINUTES, ...appointmentTimes);
  const endMinutes = Math.max(DEFAULT_END_MINUTES, ...appointmentTimes);
  const roundedStart = Math.floor(startMinutes / 60) * 60;
  const roundedEnd = Math.ceil(endMinutes / 60) * 60;
  const timelineHeight = (roundedEnd - roundedStart) * PIXELS_PER_MINUTE;
  const hourMarkers = Array.from(
    { length: (roundedEnd - roundedStart) / 60 + 1 },
    (_, index) => roundedStart + index * 60,
  );
  const columnWidth =
    selectedStaffId === "all"
      ? "minmax(240px, 1fr)"
      : "minmax(0, 1fr)";

  if (visibleStaff.length === 0) {
    return (
      <div className="border-t border-gray-200 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        No staff members are available for this day.
      </div>
    );
  }

  return (
    <div
      className="calendar-day-timeline min-h-0 flex-1 overflow-auto border-t border-gray-200 dark:border-gray-800"
      aria-label="Day appointment timeline"
    >
      <div
        className="calendar-day-grid grid"
        style={{
          gridTemplateColumns: `72px repeat(${visibleStaff.length}, ${columnWidth})`,
          minWidth:
            selectedStaffId === "all"
              ? `${72 + visibleStaff.length * 240}px`
              : "100%",
        }}
      >
        <div className="sticky left-0 top-0 z-30 border-b border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
        {visibleStaff.map((staff) => (
          <div
            key={staff.id}
            className="sticky top-0 z-20 flex h-12 items-center justify-center border-b border-r border-gray-200 bg-gray-50 px-3 text-center text-sm font-semibold text-gray-800 last:border-r-0 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <span className="truncate">{staff.name}</span>
          </div>
        ))}

        <div
          className="sticky left-0 z-10 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          style={{ height: timelineHeight }}
        >
          {hourMarkers.map((minutes) => (
            <span
              key={minutes}
              className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-gray-500 dark:text-gray-400"
              style={{
                top: (minutes - roundedStart) * PIXELS_PER_MINUTE,
              }}
            >
              {formatHour(minutes)}
            </span>
          ))}
        </div>

        {visibleStaff.map((staff) => {
          const positioned = positionAppointments(
            appointments.filter(
              (appointment) => appointment.staffId === staff.id,
            ),
          );

          return (
            <div
              key={staff.id}
              className="relative border-r border-gray-200 bg-white last:border-r-0 dark:border-gray-800 dark:bg-gray-900"
              style={{ height: timelineHeight }}
            >
              {hourMarkers.map((minutes) => (
                <div
                  key={minutes}
                  className="pointer-events-none absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                  style={{
                    top: (minutes - roundedStart) * PIXELS_PER_MINUTE,
                  }}
                />
              ))}

              {positioned.map(
                ({
                  appointment,
                  startMinutes: appointmentStart,
                  endMinutes: appointmentEnd,
                  lane,
                  laneCount,
                }) => {
                  const height =
                    (appointmentEnd - appointmentStart) * PIXELS_PER_MINUTE;
                  const width = 100 / laneCount;
                  const isCompact = height < 64;

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => onAppointmentClick(appointment)}
                      title={`${appointment.startTime}–${appointment.endTime} · ${appointment.customerName} · ${appointment.serviceName} · ${appointment.staffName}`}
                      className={`absolute overflow-hidden rounded-md border px-2 text-left shadow-theme-xs transition hover:z-10 hover:brightness-95 focus:z-20 focus:outline-none focus:ring-2 focus:ring-brand-500 ${statusClasses[appointment.status]} ${
                        isCompact ? "py-1" : "py-1.5"
                      }`}
                      style={{
                        top:
                          (appointmentStart - roundedStart) *
                            PIXELS_PER_MINUTE +
                          1,
                        height: Math.max(18, height - 2),
                        left: `calc(${lane * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                    >
                      <div className="truncate text-[11px] font-semibold leading-4">
                        {appointment.startTime}–{appointment.endTime}
                      </div>
                      {isCompact ? (
                        <div className="truncate text-[11px] font-medium leading-4">
                          {appointment.customerName} · {appointment.serviceName} ·{" "}
                          {appointment.staffName}
                        </div>
                      ) : (
                        <>
                          <div className="truncate text-xs font-semibold leading-4">
                            {appointment.customerName}
                          </div>
                          <div className="truncate text-[11px] leading-4 opacity-90">
                            {appointment.serviceName}
                          </div>
                          <div className="truncate text-[11px] leading-4 opacity-75">
                            {appointment.staffName}
                          </div>
                        </>
                      )}
                    </button>
                  );
                },
              )}

              {positioned.length === 0 && (
                <div className="absolute inset-x-3 top-6 rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  No appointments
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
