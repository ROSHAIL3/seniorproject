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
  isUnavailable?: boolean;
  unavailableLabel?: string;
  unavailableKind?: UnavailableKind;
  appointment?: Appointment;
  appointmentHeight?: number;
  selectedPreview?: {
    customerName: string;
    serviceName: string;
    staffName: string;
    startTime: string;
    endTime: string;
  };
  selectedPreviewHeight?: number;
  isCoveredBySelection?: boolean;
  onSelect: () => void;
  onUnavailableSelect?: () => void;
  onOpenAppointment: (appointment: Appointment) => void;
};

const BLOCK_INSET = 2;

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
  isUnavailable = false,
  unavailableLabel,
  unavailableKind = "occupied",
  appointment,
  appointmentHeight = 44,
  selectedPreview,
  selectedPreviewHeight = 44,
  isCoveredBySelection = false,
  onSelect,
  onUnavailableSelect,
  onOpenAppointment,
}: TimeSlotProps) {
  if (selectedPreview) {
    const isCompact = selectedPreviewHeight < 84;

    return (
      <div
        role="status"
        aria-label={`Selected booking for ${selectedPreview.customerName} with ${selectedPreview.staffName}, ${selectedPreview.startTime} to ${selectedPreview.endTime}`}
        style={{ height: selectedPreviewHeight, top: BLOCK_INSET }}
        title={`${selectedPreview.startTime}–${selectedPreview.endTime} · ${selectedPreview.customerName} · ${selectedPreview.serviceName} · ${selectedPreview.staffName}`}
        className="absolute inset-x-1 z-30 min-w-0 overflow-hidden rounded-lg border-2 border-dashed border-brand-600 bg-brand-50 p-2 text-left text-gray-950 shadow-theme-sm ring-2 ring-brand-500/15 dark:border-brand-400 dark:bg-brand-500/20 dark:text-white"
      >
        <span className="block truncate text-[10px] font-semibold leading-4 text-brand-700 dark:text-brand-300">
          {selectedPreview.startTime}–{selectedPreview.endTime} · Pending
        </span>
        <span className="block truncate text-xs font-bold leading-4">
          {selectedPreview.customerName}
        </span>
        <span className="block truncate text-[11px] leading-4 text-gray-700 dark:text-gray-200">
          {selectedPreview.serviceName}
        </span>
        {!isCompact && (
          <span className="block truncate text-[11px] leading-4 text-gray-600 dark:text-gray-300">
            {selectedPreview.staffName}
          </span>
        )}
      </div>
    );
  }

  if (appointment) {
    return (
      <button
        type="button"
        onClick={() => onOpenAppointment(appointment)}
        style={{ height: appointmentHeight, top: BLOCK_INSET }}
        title={`${appointment.startTime}–${appointment.endTime} · ${appointment.customerName} · ${appointment.serviceName} · ${appointment.status}`}
        className={`absolute inset-x-1 z-20 min-w-0 overflow-hidden rounded-lg border-l-4 p-2 text-left shadow-theme-sm transition duration-150 hover:z-30 hover:-translate-y-0.5 hover:shadow-md focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900 ${appointmentStyles[appointment.status]}`}
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

  if (isCoveredBySelection) {
    return (
      <div
        aria-hidden="true"
        className="h-full w-full bg-brand-50/60 dark:bg-brand-500/[0.08]"
      />
    );
  }

  if (isUnavailable) {
    return (
      <button
        type="button"
        aria-disabled="true"
        onClick={onUnavailableSelect}
        aria-label={`${unavailableLabel ?? "Unavailable"} for ${staff.name} at ${time}`}
        title={unavailableLabel}
        className={`flex h-full w-full min-w-0 items-center justify-center px-2 text-center text-[10px] font-medium leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-error-400 ${unavailableStyles[unavailableKind]}`}
      >
        {unavailableLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Book ${staff.name} at ${time}`}
      className="group flex h-full w-full items-center justify-center bg-white transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 dark:bg-gray-900 dark:hover:bg-white/[0.04]"
    >
      <PlusIcon
        className="size-5 text-brand-600 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-brand-400"
      />
    </button>
  );
}
