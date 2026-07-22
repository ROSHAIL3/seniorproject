"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppointmentFilters from "./AppointmentFilters";
import AppointmentTable from "./AppointmentTable";
import Pagination from "@/components/tables/Pagination";
import Select from "@/components/form/Select";
import type { Appointment, DateFilter } from "@/types/appointments";

const pageSizeOptions = [
  { value: "5", label: "5 per page" },
  { value: "10", label: "10 per page" },
  { value: "20", label: "20 per page" },
];

type AppointmentsListClientProps = {
  initialAppointments: Appointment[];
  referenceToday: string;
};

export default function AppointmentsListClient({
  initialAppointments,
  referenceToday,
}: AppointmentsListClientProps) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    },
    [],
  );

  const showLoading = () => {
    setIsLoading(true);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setIsLoading(false), 250);
  };

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const weekEndDate = new Date(`${referenceToday}T00:00:00Z`);
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);
    const monthPrefix = referenceToday.slice(0, 7);

    return initialAppointments.filter((appointment) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          appointment.bookingNumber,
          appointment.customerName,
          appointment.customerPhone,
          appointment.customerEmail,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "upcoming" && appointment.appointmentDate >= referenceToday) ||
        (dateFilter === "today" && appointment.appointmentDate === referenceToday) ||
        (dateFilter === "week" &&
          appointment.appointmentDate >= referenceToday &&
          appointment.appointmentDate <= weekEnd) ||
        (dateFilter === "month" && appointment.appointmentDate.startsWith(monthPrefix));

      return matchesSearch && matchesDate;
    });
  }, [dateFilter, initialAppointments, referenceToday, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleAppointments = filteredAppointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    showLoading();
  };

  const handleDateFilter = (value: DateFilter) => {
    setDateFilter(value);
    setPage(1);
    showLoading();
  };

  const exportCsv = () => {
    const headings = [
      "Booking Number",
      "Date",
      "Start Time",
      "End Time",
      "Customer",
      "Phone",
      "Email",
      "Staff",
      "Service",
      "Status",
      "Created By",
    ];
    const rows = filteredAppointments.map((appointment) => [
      appointment.bookingNumber,
      appointment.appointmentDate,
      appointment.startTime,
      appointment.endTime,
      appointment.customerName,
      appointment.customerPhone,
      appointment.customerEmail,
      appointment.staffName,
      appointment.serviceName,
      appointment.status,
      appointment.createdBy,
    ]);
    const csv = [headings, ...rows]
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "appointments.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage bookings, staff assignments, and appointment status.
          </p>
        </div>
        <AppointmentFilters
          search={search}
          dateFilter={dateFilter}
          onSearchChange={handleSearch}
          onDateFilterChange={handleDateFilter}
          onExport={exportCsv}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <AppointmentTable
          appointments={visibleAppointments}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isLoading={isLoading}
        />

        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredAppointments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredAppointments.length)} of {filteredAppointments.length}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-36">
              <Select
                key={pageSize}
                options={pageSizeOptions}
                defaultValue={String(pageSize)}
                onChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                  showLoading();
                }}
              />
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
