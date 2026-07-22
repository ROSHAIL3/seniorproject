import ComponentCard from "@/components/common/ComponentCard";
import {
  CalenderIcon,
  EnvelopeIcon,
  PencilIcon,
  PhoneIcon,
  TimeIcon,
  UserIcon,
} from "@/icons";
import { formatBhd, formatDisplayDate } from "@/lib/formatters";
import { timeToMinutes } from "./validation";
import type { Appointment } from "./types";

type AppointmentDetailsCardProps = {
  appointment: Appointment;
};

type DetailItemProps = {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
};

function DetailItem({ label, value, icon }: DetailItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 [&>svg]:block [&>svg]:size-5 [&>svg]:shrink-0"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <div className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function AppointmentDetailsCard({
  appointment,
}: AppointmentDetailsCardProps) {
  const duration =
    timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime);

  return (
    <ComponentCard title="Appointment information" className="h-full">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-6 dark:border-gray-800 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Service
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
            {appointment.serviceName}
          </h2>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Price
          </p>
          <p className="mt-1 text-xl font-semibold text-brand-600 dark:text-brand-400">
            {formatBhd(appointment.priceBhd)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <DetailItem
          label="Date"
          value={formatDisplayDate(appointment.appointmentDate)}
          icon={<CalenderIcon />}
        />
        <DetailItem
          label="Time"
          value={
            <>
              <span>
                {appointment.startTime}–{appointment.endTime}
              </span>
              <span className="ml-2 text-xs font-normal text-gray-400">
                {duration} min
              </span>
            </>
          }
          icon={<TimeIcon />}
        />
        <DetailItem
          label="Assigned staff"
          value={appointment.staffName}
          icon={<UserIcon />}
        />
        <DetailItem
          label="Created by"
          value={appointment.createdBy}
          icon={<PencilIcon />}
        />
        <DetailItem
          label="Customer phone"
          value={appointment.customerPhone}
          icon={<PhoneIcon />}
        />
        <DetailItem
          label="Customer email"
          value={
            <a
              href={`mailto:${appointment.customerEmail}`}
              className="break-all text-brand-500 hover:text-brand-600"
            >
              {appointment.customerEmail}
            </a>
          }
          icon={<EnvelopeIcon />}
        />
      </div>
    </ComponentCard>
  );
}
