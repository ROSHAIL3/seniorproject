import { PlusIcon } from "@/icons";
import type { Appointment, StaffMember } from "./types";

type UnavailableKind =
  | "day-off"
  | "break"
  | "other-branch"
  | "not-assigned"
  | "occupied";

type TimeSlotProps = {
  time: string;
  staff: StaffMember;
  isSelected: boolean;
  isUnavailable?: boolean;
  unavailableLabel?: string;
  unavailableKind?: UnavailableKind;
  appointment?: Appointment;
  appointmentHeight?: number;
  onSelect: () => void;
  onOpenAppointment: (appointment: Appointment) => void;
};

const appointmentStyles: Record<Appointment["status"], string> = {
  Booked:
    "!border-blue-400 !bg-white !text-gray-950 dark:!border-blue-400/70 dark:!bg-gray-800 dark:!text-white",
  Confirmed:
    "!border-emerald-400 !bg-white !text-gray-950 dark:!border-emerald-400/70 dark:!bg-gray-800 dark:!text-white",
  Completed:
    "!border-gray-400 !bg-gray-50 !text-gray-950 dark:!border-gray-500 dark:!bg-gray-800 dark:!text-white",
  Cancelled:
    "!border-red-400 !bg-white !text-gray-950 dark:!border-red-400/70 dark:!bg-gray-800 dark:!text-white",
  "No Show":
    "!border-amber-400 !bg-white !text-gray-950 dark:!border-amber-400/70 dark:!bg-gray-800 dark:!text-white",
};

const statusBadgeStyles: Record<Appointment["status"], string> = {
  Booked: "bg-blue-100 text-blue-800 dark:bg-blue-400/20 dark:text-blue-200",
  Confirmed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
  Completed: "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-200",
  "No Show":
    "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
};

const unavailableStyles: Record<UnavailableKind, string> = {
  "day-off":
    "bg-gray-100 text-gray-600 dark:bg-gray-800/80 dark:text-gray-300",
  break:
    "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
  "other-branch":
    "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200",
  "not-assigned":
    "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200",
  occupied: "bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400",
};

export default function TimeSlot({
  time,
  staff,
  isSelected,
  isUnavailable = false,
  unavailableLabel,
  unavailableKind = "occupied",
  appointment,
  appointmentHeight = 44,
  onSelect,
  onOpenAppointment,
}: TimeSlotProps) {
  if (appointment) {
    return (
      <button
        type="button"
        onClick={() => onOpenAppointment(appointment)}
        style={{ height: appointmentHeight }}
        title={`${appointment.startTime}–${appointment.endTime} · ${appointment.customerName} · ${appointment.serviceName} · ${appointment.status}`}
        className={`absolute inset-x-1 top-0 z-20 min-w-0 overflow-hidden rounded-lg border-l-4 p-2 text-left shadow-theme-sm transition duration-150 hover:z-30 hover:-translate-y-0.5 hover:shadow-md focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 ${appointmentStyles[appointment.status]}`}
      >
        <span className="block text-[10px] font-semibold leading-4 text-gray-600 dark:text-gray-300">
          {appointment.startTime}–{appointment.endTime}
        </span>
        <span className="block break-words text-xs font-bold leading-4">
          {appointment.customerName}
        </span>
        <span className="block break-words text-[11px] leading-4 text-gray-700 dark:text-gray-200">
          {appointment.serviceName}
        </span>
        <span
          className={`mt-1 inline-flex max-w-full rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-3 ${statusBadgeStyles[appointment.status]}`}
        >
          {appointment.status}
        </span>
      </button>
    );
  }

  if (isUnavailable) {
    return (
      <div
        title={unavailableLabel}
        className={`flex h-full min-w-0 items-center justify-center px-2 text-center text-[10px] font-medium leading-tight ${unavailableStyles[unavailableKind]}`}
      >
        {unavailableLabel}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Book ${staff.name} at ${time}`}
      className={`group flex h-full w-full items-center justify-center bg-white transition dark:bg-gray-900 ${
        isSelected
          ? "bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-500/15"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
      }`}
    >
      <PlusIcon
        className={`size-5 text-brand-500 transition ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      />
    </button>
  );
}
