import { PlusIcon } from "@/icons";
import type { Appointment, StaffMember } from "./types";

type TimeSlotProps = {
  time: string;
  staff: StaffMember;
  isSelected: boolean;
  isUnavailable?: boolean;
  unavailableLabel?: string;
  appointment?: Appointment;
  appointmentHeight?: number;
  onSelect: () => void;
  onOpenAppointment: (appointment: Appointment) => void;
};

export default function TimeSlot({
  time,
  staff,
  isSelected,
  isUnavailable = false,
  unavailableLabel,
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
        className="absolute inset-x-1 top-0 z-20 overflow-hidden rounded-lg border border-brand-200 bg-brand-500 p-2 text-left text-white shadow-theme-sm transition hover:bg-brand-600"
      >
        <span className="block truncate text-xs font-semibold">
          {appointment.customerName}
        </span>
        <span className="block truncate text-[11px] text-white/90">
          {appointment.serviceName}
        </span>
        <span className="block text-[10px] text-white/80">
          {appointment.startTime}–{appointment.endTime}
        </span>
      </button>
    );
  }

  if (isUnavailable) {
    return (
      <div
        title={unavailableLabel}
        className="flex h-full items-center justify-center bg-gray-50 text-[10px] text-gray-400 dark:bg-white/[0.02]"
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
      className={`group flex h-full w-full items-center justify-center transition ${
        isSelected
          ? "bg-brand-50 ring-2 ring-inset ring-brand-500 dark:bg-brand-500/15"
          : "hover:bg-brand-50 dark:hover:bg-brand-500/10"
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
