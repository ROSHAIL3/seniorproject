import ComponentCard from "@/components/common/ComponentCard";
import AvatarText from "@/components/ui/avatar/AvatarText";
import Badge from "@/components/ui/badge/Badge";
import { CalenderIcon, TimeIcon, UserIcon } from "@/icons";
import DashboardEmptyState from "./DashboardEmptyState";
import type { Appointment } from "./types";

type NextUpTodayProps = {
  appointment: Appointment | null;
};

export default function NextUpToday({ appointment }: NextUpTodayProps) {
  return (
    <ComponentCard title="Next Up Today" className="h-full">
      {appointment ? (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <AvatarText
              name={appointment.customerName}
              className="h-12 w-12 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-gray-800 dark:text-white/90">
                  {appointment.customerName}
                </p>
                <Badge color="success" size="sm">
                  {appointment.status}
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                {appointment.serviceName}
              </p>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <TimeIcon className="size-5 text-brand-500" />
              <span className="font-medium">
                {appointment.startTime}–{appointment.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UserIcon className="size-5" />
              <span>{appointment.staffName}</span>
            </div>
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          title="No more appointments today"
          description="Your schedule is clear for the rest of the day."
        />
      )}
      {appointment && (
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-white/[0.03] dark:text-gray-400">
          <CalenderIcon className="size-5 text-brand-500" />
          <span>
            Appointment{" "}
            <span className="font-medium">{appointment.bookingNumber}</span>
          </span>
        </div>
      )}
    </ComponentCard>
  );
}
