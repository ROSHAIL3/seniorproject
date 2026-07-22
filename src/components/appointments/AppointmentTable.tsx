"use client";

import { useRouter } from "next/navigation";
import Checkbox from "@/components/form/input/Checkbox";
import AvatarText from "@/components/ui/avatar/AvatarText";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreDotIcon } from "@/icons";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import { formatDisplayDate } from "@/lib/formatters";
import type { Appointment } from "@/types/appointments";

type AppointmentTableProps = {
  appointments: Appointment[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
};

const headings = [
  "Booking number",
  "Date",
  "Time",
  "Customer",
  "Staff",
  "Service",
  "Status",
  "Created by",
  "Actions",
];

export default function AppointmentTable({
  appointments,
  selectedIds,
  onSelectionChange,
  isLoading = false,
}: AppointmentTableProps) {
  const router = useRouter();
  const allSelected =
    appointments.length > 0 &&
    appointments.every((appointment) => selectedIds.includes(appointment.id));

  const toggleAll = (checked: boolean) => {
    onSelectionChange(checked ? appointments.map((item) => item.id) : []);
  };

  const toggleOne = (id: string, checked: boolean) => {
    onSelectionChange(
      checked
        ? Array.from(new Set([...selectedIds, id]))
        : selectedIds.filter((selectedId) => selectedId !== id),
    );
  };

  if (isLoading) return <AppointmentTableLoading />;

  if (appointments.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <span className="text-xl text-gray-400">#</span>
        </div>
        <h3 className="font-medium text-gray-800 dark:text-white/90">
          No appointments found
        </h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Try another search or date filter, or create a new appointment.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden max-w-full overflow-x-auto md:block">
        <Table className="min-w-[1380px]">
          <TableHeader className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-start">
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </TableCell>
              {headings.map((heading) => (
                <TableCell
                  key={heading}
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {appointments.map((appointment) => (
              <TableRow
                key={appointment.id}
                className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
              >
                <TableCell
                  className="px-5 py-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.includes(appointment.id)}
                    onChange={(checked) => toggleOne(appointment.id, checked)}
                  />
                </TableCell>
                <TableCell
                  className="whitespace-nowrap px-4 py-4 text-sm font-medium text-brand-500 dark:text-brand-400"
                  onClick={() =>
                    router.push(`/appointments/${appointment.bookingNumber}`)
                  }
                >
                  {appointment.bookingNumber}
                </TableCell>
                <TableCell
                  className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300"
                  onClick={() =>
                    router.push(`/appointments/${appointment.bookingNumber}`)
                  }
                >
                  {formatDisplayDate(appointment.appointmentDate)}
                </TableCell>
                <TableCell
                  className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300"
                  onClick={() =>
                    router.push(`/appointments/${appointment.bookingNumber}`)
                  }
                >
                  {appointment.startTime}–{appointment.endTime}
                </TableCell>
                <TableCell
                  className="px-4 py-4"
                  onClick={() =>
                    router.push(`/appointments/${appointment.bookingNumber}`)
                  }
                >
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
                {[appointment.staffName, appointment.serviceName].map(
                  (value) => (
                    <TableCell
                      key={value}
                      className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400"
                      onClick={() =>
                        router.push(
                          `/appointments/${appointment.bookingNumber}`,
                        )
                      }
                    >
                      {value}
                    </TableCell>
                  ),
                )}
                <TableCell
                  className="px-4 py-4"
                  onClick={() =>
                    router.push(`/appointments/${appointment.bookingNumber}`)
                  }
                >
                  <AppointmentStatusBadge status={appointment.status} />
                </TableCell>
                <TableCell
                  className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400"
                  onClick={() =>
                    router.push(`/appointments/${appointment.bookingNumber}`)
                  }
                >
                  {appointment.createdBy}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/appointments/${appointment.bookingNumber}`)
                    }
                    aria-label={`Open ${appointment.bookingNumber}`}
                    className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <MoreDotIcon className="size-5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
        {appointments.map((appointment) => (
          <button
            type="button"
            key={appointment.id}
            onClick={() =>
              router.push(`/appointments/${appointment.bookingNumber}`)
            }
            className="block w-full px-4 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarText
                  name={appointment.customerName}
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800 dark:text-white/90">
                    {appointment.customerName}
                  </p>
                  <p className="mt-0.5 text-xs text-brand-500">
                    {appointment.bookingNumber}
                  </p>
                </div>
              </div>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatDisplayDate(appointment.appointmentDate)}</span>
              <span className="text-right">
                {appointment.startTime}–{appointment.endTime}
              </span>
              <span className="truncate">{appointment.serviceName}</span>
              <span className="truncate text-right">
                {appointment.staffName}
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function AppointmentTableLoading() {
  return (
    <div className="space-y-3 p-5" aria-label="Loading appointments">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}
