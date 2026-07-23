"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DayCellContentArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  MoreLinkArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/form/Select";
import AppointmentStatusBadge from "@/components/appointments/AppointmentStatusBadge";
import { REFERENCE_TODAY } from "@/config/business";
import { useAppointments } from "@/hooks/useAppointments";
import { formatDisplayDate } from "@/lib/formatters";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import type { StaffMember } from "@/types/staff";

type CalendarProps = {
  initialAppointments: Appointment[];
  staffMembers: StaffMember[];
};

const statusCalendar: Record<AppointmentStatus, string> = {
  Booked: "primary",
  Confirmed: "success",
  Completed: "success",
  Cancelled: "danger",
  "No Show": "warning",
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Calendar({
  initialAppointments,
  staffMembers,
}: CalendarProps) {
  const router = useRouter();
  const appointments = useAppointments(initialAppointments);
  const [selectedDate, setSelectedDate] = useState(REFERENCE_TODAY);
  const [selectedStaffId, setSelectedStaffId] = useState("all");

  const filteredAppointments = useMemo(
    () =>
      selectedStaffId === "all"
        ? appointments
        : appointments.filter(
            (appointment) => appointment.staffId === selectedStaffId,
          ),
    [appointments, selectedStaffId],
  );

  const appointmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredAppointments.forEach((appointment) => {
      counts.set(
        appointment.appointmentDate,
        (counts.get(appointment.appointmentDate) ?? 0) + 1,
      );
    });
    return counts;
  }, [filteredAppointments]);

  const selectedAppointments = useMemo(
    () =>
      filteredAppointments
        .filter(
          (appointment) => appointment.appointmentDate === selectedDate,
        )
        .sort((first, second) =>
          first.startTime.localeCompare(second.startTime),
        ),
    [filteredAppointments, selectedDate],
  );

  const events: EventInput[] = filteredAppointments.map((appointment) => ({
    id: appointment.id,
    title: `${appointment.customerName} · ${appointment.serviceName}`,
    start: `${appointment.appointmentDate}T${appointment.startTime}:00`,
    end: `${appointment.appointmentDate}T${appointment.endTime}:00`,
    extendedProps: {
      bookingNumber: appointment.bookingNumber,
      calendar: statusCalendar[appointment.status],
      customerName: appointment.customerName,
      serviceName: appointment.serviceName,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    },
  }));

  const staffOptions = [
    { value: "all", label: "All staff" },
    ...staffMembers.map((staff) => ({ value: staff.id, label: staff.name })),
  ];

  const handleDateClick = (selection: DateClickArg) => {
    setSelectedDate(selection.dateStr.slice(0, 10));
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    router.push(`/appointments/${clickInfo.event.extendedProps.bookingNumber}`);
  };

  const handleMoreClick = (moreInfo: MoreLinkArg) => {
    setSelectedDate(toIsoDate(moreInfo.date));
  };

  const renderDayCell = (day: DayCellContentArg) => {
    // Time-grid cells and its all-day lane also invoke this callback. Counts
    // belong in the time-grid date header, not in those layout cells.
    if (day.view.type === "dayGridWeek") {
      const count = appointmentCounts.get(toIsoDate(day.date)) ?? 0;
      return count === 0 ? (
        <span className="calendar-week-empty-label">No appointments</span>
      ) : null;
    }

    if (day.view.type !== "dayGridMonth") {
      return day.dayNumberText;
    }

    const date = toIsoDate(day.date);
    const count = appointmentCounts.get(date) ?? 0;

    return (
      <div className="flex w-full items-start justify-between gap-2">
        <span>{day.dayNumberText}</span>
        {count > 0 && (
          <span
            aria-label={`${count} appointment${count === 1 ? "" : "s"}`}
            className="calendar-appointment-count"
          >
            {count}
          </span>
        )}
      </div>
    );
  };

  const renderDayHeader = (day: DayHeaderContentArg) => {
    const count = appointmentCounts.get(toIsoDate(day.date)) ?? 0;
    if (day.view.type === "dayGridWeek") {
      return (
        <div className="calendar-week-day-header">
          <span className="calendar-week-day-name">
            {day.date.toLocaleDateString(undefined, { weekday: "short" })}
          </span>
          <span className="calendar-week-day-number">{day.date.getDate()}</span>
          {count > 0 && (
            <span
              aria-label={`${count} appointment${count === 1 ? "" : "s"}`}
              className="calendar-appointment-count"
            >
              {count}
            </span>
          )}
        </div>
      );
    }

    if (!day.view.type.startsWith("timeGrid") || count === 0) {
      return day.text;
    }
    return (
      <span className="inline-flex items-center gap-2">
        {day.text}
        <span className="calendar-appointment-count">{count}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Appointments Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a date to review its appointments.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select
            key={selectedStaffId}
            options={staffOptions}
            defaultValue={selectedStaffId}
            onChange={setSelectedStaffId}
            placeholder="Filter by staff"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] sm:-mx-2">
        <div className="custom-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={REFERENCE_TODAY}
            headerToolbar={{
              left: "prev,next addAppointmentButton",
              center: "title",
              right: "dayGridMonth,dayGridWeek,timeGridDay",
            }}
            views={{
              dayGridMonth: {
                buttonText: "month",
                dayMaxEvents: 2,
              },
              dayGridWeek: {
                buttonText: "week",
                dayMaxEvents: false,
                duration: { weeks: 1 },
              },
              timeGridDay: {
                buttonText: "day",
              },
            }}
            events={events}
            height="auto"
            eventMaxStack={2}
            eventOrder="start"
            displayEventEnd
            slotEventOverlap={false}
            moreLinkClick={handleMoreClick}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            dayCellContent={renderDayCell}
            dayHeaderContent={renderDayHeader}
            dayCellClassNames={(day) =>
              [
                ...(toIsoDate(day.date) === selectedDate
                  ? [
                      day.view.type.startsWith("timeGrid")
                        ? "calendar-selected-column"
                        : "calendar-selected-date",
                    ]
                  : []),
                ...(day.view.type === "dayGridWeek"
                  ? [
                      (appointmentCounts.get(toIsoDate(day.date)) ?? 0) === 0
                        ? "calendar-week-empty"
                        : "calendar-week-has-events",
                    ]
                  : []),
              ]
            }
            dayHeaderClassNames={(day) =>
              day.view.type !== "dayGridMonth" &&
              toIsoDate(day.date) === selectedDate
                ? ["calendar-selected-header"]
                : []
            }
            customButtons={{
              addAppointmentButton: {
                text: "New Appointment +",
                click: () => router.push(`/appointments/new?date=${selectedDate}`),
              },
            }}
          />
        </div>
      </div>

      <section aria-labelledby="selected-date-appointments">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="selected-date-appointments"
            className="text-xl font-semibold text-gray-800 dark:text-white/90"
          >
            Appointments for {formatDisplayDate(selectedDate)}
          </h2>
          {selectedAppointments.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedAppointments.length} total
            </span>
          )}
        </div>

        {selectedAppointments.length > 0 ? (
          <div className="space-y-3">
            {selectedAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() =>
                  router.push(`/appointments/${appointment.bookingNumber}`)
                }
                className="grid w-full gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5 sm:grid-cols-[150px_1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {appointment.startTime}–{appointment.endTime}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {appointment.bookingNumber}
                  </p>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                  <AppointmentListField
                    label="Customer"
                    value={appointment.customerName}
                  />
                  <AppointmentListField
                    label="Service"
                    value={appointment.serviceName}
                  />
                  <AppointmentListField
                    label="Staff"
                    value={appointment.staffName}
                  />
                </div>
                <div className="justify-self-start sm:justify-self-end">
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
            No appointments on this day
          </div>
        )}
      </section>
    </div>
  );
}

function AppointmentListField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar}`;
  const isTimeGrid = eventInfo.view.type.startsWith("timeGrid");
  const isWeekBoard = eventInfo.view.type === "dayGridWeek";
  const {
    customerName,
    serviceName,
    startTime,
    endTime,
  } = eventInfo.event.extendedProps as {
    customerName: string;
    serviceName: string;
    startTime: string;
    endTime: string;
  };

  if (isWeekBoard) {
    return (
      <div className={`event-fc-color calendar-week-event ${colorClass}`}>
        <div className="calendar-event-time-range">
          {startTime} – {endTime}
        </div>
        <div className="calendar-event-customer">{customerName}</div>
        <div className="calendar-event-service">{serviceName}</div>
      </div>
    );
  }

  if (isTimeGrid) {
    return (
      <div className={`event-fc-color calendar-timegrid-event ${colorClass}`}>
        <div className="calendar-event-time-range">
          {startTime} – {endTime}
        </div>
        <div className="calendar-event-customer">{customerName}</div>
        <div className="calendar-event-service">{serviceName}</div>
      </div>
    );
  }

  return (
    <div className={`event-fc-color calendar-daygrid-event ${colorClass}`}>
      <div className="fc-daygrid-event-dot" />
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};
