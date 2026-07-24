"use client";

import { useEffect, useRef } from "react";
import AppointmentStatusBadge from "@/components/appointments/AppointmentStatusBadge";
import { formatDisplayDate } from "@/lib/formatters";
import type { Appointment } from "@/types/appointments";

type MoreAppointmentsModalProps = {
  date: string;
  appointments: Appointment[];
  onClose: () => void;
  onAppointmentClick: (appointment: Appointment) => void;
};

export default function MoreAppointmentsModal({
  date,
  appointments,
  onClose,
  onAppointmentClick,
}: MoreAppointmentsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex bg-gray-950/65 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-appointments-title"
        className="mt-auto flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900 sm:mt-0 sm:h-auto sm:max-h-[min(720px,calc(100dvh-2rem))] sm:max-w-xl sm:rounded-2xl sm:border sm:border-gray-200 dark:sm:border-gray-700"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              Appointments
            </p>
            <h2
              id="more-appointments-title"
              className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90"
            >
              {formatDisplayDate(date)}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {appointments.length} appointment
              {appointments.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close appointment list"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50 p-3 dark:bg-gray-950/40 sm:p-4">
          {appointments.length > 0 ? (
            <div className="space-y-2">
              {appointments.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onAppointmentClick(appointment)}
                  className="grid w-full gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5 sm:grid-cols-[108px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white/90">
                      {appointment.startTime}–{appointment.endTime}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {appointment.bookingNumber}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {appointment.customerName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                      {appointment.serviceName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {appointment.staffName}
                    </p>
                  </div>
                  <div className="justify-self-start sm:justify-self-end">
                    <AppointmentStatusBadge status={appointment.status} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              No appointments on this day
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
