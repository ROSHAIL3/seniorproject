import Link from "next/link";
import ComponentCard from "@/components/common/ComponentCard";
import AvatarText from "@/components/ui/avatar/AvatarText";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardEmptyState from "./DashboardEmptyState";
import type { Appointment } from "./types";
import type { AppointmentStatus } from "@/types/appointments";
import { formatDisplayDate } from "@/lib/formatters";

type UpcomingAppointmentsProps = {
  appointments: Appointment[];
};

const statusColor = (status: AppointmentStatus) => {
  if (status === "Confirmed" || status === "Completed") return "success" as const;
  if (status === "No Show") return "warning" as const;
  if (status === "Cancelled") return "error" as const;
  return "info" as const;
};

export default function UpcomingAppointments({
  appointments,
}: UpcomingAppointmentsProps) {
  return (
    <ComponentCard
      title="Upcoming (7 days)"
      bodyClassName="p-0"
      action={
        <Link
          href="/appointments"
          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View All
        </Link>
      }
    >
      {appointments.length > 0 ? (
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {['Date', 'Time', 'Customer', 'Service', 'Status'].map(
                  (heading) => (
                    <TableCell
                      key={heading}
                      isHeader
                      className="px-6 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {heading}
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatDisplayDate(appointment.appointmentDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {appointment.startTime}–{appointment.endTime}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <AvatarText
                        name={appointment.customerName}
                        className="h-8 w-8 shrink-0 text-xs"
                      />
                      <span className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-white/90">
                        {appointment.customerName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {appointment.serviceName}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={statusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <DashboardEmptyState
          title="No upcoming appointments"
          description="Appointments scheduled in the next seven days will appear here."
        />
      )}
    </ComponentCard>
  );
}
