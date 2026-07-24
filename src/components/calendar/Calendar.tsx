"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  DayCellContentArg,
  DayHeaderContentArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  MoreLinkArg,
  MoreLinkSimpleAction,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/form/Select";
import { REFERENCE_TODAY } from "@/config/business";
import { useAppointments } from "@/hooks/useAppointments";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import type { StaffMember } from "@/types/staff";
import { useSidebar } from "@/context/SidebarContext";
import DayTimeline from "./DayTimeline";
import MoreAppointmentsModal from "./MoreAppointmentsModal";

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
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const appointments = useAppointments(initialAppointments);
  const [selectedDate, setSelectedDate] = useState(REFERENCE_TODAY);
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [moreAppointmentsDate, setMoreAppointmentsDate] = useState<
    string | null
  >(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
    },
    [],
  );

  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    let resizeFrame = 0;
    const updateCalendarSize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        calendarRef.current?.getApi().updateSize();
      });
    };
    const resizeObserver = new ResizeObserver(updateCalendarSize);
    resizeObserver.observe(container);
    updateCalendarSize();
    const transitionTimer = window.setTimeout(updateCalendarSize, 320);

    return () => {
      window.clearTimeout(transitionTimer);
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
    };
  }, [isExpanded, isHovered, isMobileOpen]);

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

  const moreAppointments = useMemo(
    () =>
      moreAppointmentsDate
        ? filteredAppointments
            .filter(
              (appointment) =>
                appointment.appointmentDate === moreAppointmentsDate,
            )
            .sort(
              (first, second) =>
                first.startTime.localeCompare(second.startTime) ||
                first.endTime.localeCompare(second.endTime),
            )
        : [],
    [filteredAppointments, moreAppointmentsDate],
  );

  const events: EventInput[] = [...filteredAppointments]
    .sort(
      (first, second) =>
        first.appointmentDate.localeCompare(second.appointmentDate) ||
        first.startTime.localeCompare(second.startTime),
    )
    .map((appointment) => ({
      id: appointment.id,
      title: `${appointment.customerName} · ${appointment.serviceName}`,
      start: `${appointment.appointmentDate}T${appointment.startTime}:00`,
      end: `${appointment.appointmentDate}T${appointment.endTime}:00`,
      extendedProps: {
        bookingNumber: appointment.bookingNumber,
        calendar: statusCalendar[appointment.status],
        customerName: appointment.customerName,
        serviceName: appointment.serviceName,
        staffName: appointment.staffName,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      },
    }));

  const staffOptions = [
    { value: "all", label: "All staff" },
    ...staffMembers.map((staff) => ({ value: staff.id, label: staff.name })),
  ];

  const handleDateClick = (selection: DateClickArg) => {
    selectDate(selection.dateStr.slice(0, 10));
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    router.push(`/appointments/${clickInfo.event.extendedProps.bookingNumber}`);
  };

  const handleMoreClick = (moreInfo: MoreLinkArg) => {
    const date = toIsoDate(moreInfo.date);
    selectDate(date);
    setMoreAppointmentsDate(date);
    // FullCalendar treats a void return as a request for its native popover.
    // A handled, truthy non-view result suppresses that fallback.
    return true as unknown as MoreLinkSimpleAction;
  };

  const handleDatesSet = (dateInfo: DatesSetArg) => {
    setCurrentView(dateInfo.view.type);
    if (dateInfo.view.type === "timeGridDay") {
      selectDate(toIsoDate(dateInfo.start));
    }
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
        <span
          role="button"
          tabIndex={0}
          className="calendar-date-trigger"
          onClick={(event) => {
            event.stopPropagation();
            selectDate(date);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectDate(date);
            }
          }}
        >
          {day.dayNumberText}
        </span>
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
      const date = toIsoDate(day.date);
      return (
        <div
          className="calendar-week-day-header calendar-date-trigger"
          role="button"
          tabIndex={0}
          onClick={() => selectDate(date)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectDate(date);
            }
          }}
        >
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

      <div
        ref={calendarContainerRef}
        className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] sm:-mx-2 md:h-[calc(100dvh-180px)] md:min-h-[560px]"
      >
        <div
          className={`custom-calendar h-full min-w-0 ${
            currentView === "timeGridDay"
              ? "is-custom-day-view flex min-h-0 flex-col"
              : ""
          }`}
        >
          <FullCalendar
            ref={calendarRef}
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
                dayMaxEvents: 3,
                duration: { weeks: 1 },
              },
              timeGridDay: {
                buttonText: "day",
              },
            }}
            events={events}
            height={currentView === "timeGridDay" ? "auto" : "100%"}
            eventMaxStack={2}
            eventOrder="start"
            eventOrderStrict
            displayEventEnd
            slotEventOverlap={false}
            moreLinkClick={handleMoreClick}
            datesSet={handleDatesSet}
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
          {currentView === "timeGridDay" && (
            <DayTimeline
              appointments={selectedAppointments}
              staffMembers={staffMembers}
              selectedStaffId={selectedStaffId}
              onAppointmentClick={(appointment) =>
                router.push(`/appointments/${appointment.bookingNumber}`)
              }
            />
          )}
        </div>
      </div>

      {moreAppointmentsDate && (
        <MoreAppointmentsModal
          date={moreAppointmentsDate}
          appointments={moreAppointments}
          onClose={() => setMoreAppointmentsDate(null)}
          onAppointmentClick={(appointment) =>
            router.push(`/appointments/${appointment.bookingNumber}`)
          }
        />
      )}
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
    staffName,
    startTime,
    endTime,
  } = eventInfo.event.extendedProps as {
    customerName: string;
    serviceName: string;
    staffName: string;
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
        <div className="calendar-event-staff">{staffName}</div>
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
