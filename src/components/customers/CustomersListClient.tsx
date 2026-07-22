"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Input from "@/components/form/input/InputField";
import Pagination from "@/components/tables/Pagination";
import Button from "@/components/ui/button/Button";
import { DownloadIcon, PlusIcon, SearchIcon } from "@/icons";
import { useCustomerProfiles } from "@/hooks/useCustomerProfiles";
import type { CustomerProfile } from "@/types/customers";
import CustomerCard from "./CustomerCard";
import CustomerFormModal from "./CustomerFormModal";

const PAGE_SIZE = 8;

export default function CustomersListClient({
  initialProfiles,
}: {
  initialProfiles: CustomerProfile[];
}) {
  const profiles = useCustomerProfiles(initialProfiles);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    },
    [],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return profiles;
    return profiles.filter(({ customer }) =>
      [customer.name, customer.email, customer.phone].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [profiles, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleProfiles = filteredProfiles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setIsLoading(true);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setIsLoading(false), 200);
  };

  const exportCsv = () => {
    const headings = [
      "Full Name",
      "Email",
      "Phone",
      "Total Visits",
      "Last Visit",
      "Status",
      "Notes",
    ];
    const rows = filteredProfiles.map((profile) => [
      profile.customer.name,
      profile.customer.email,
      profile.customer.phone,
      String(profile.totalVisits),
      profile.lastVisit ?? "",
      profile.customer.status,
      profile.customer.notes,
    ]);
    const csv = [headings, ...rows]
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Customers
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {profiles.length} {profiles.length === 1 ? "customer" : "customers"}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            startIcon={<DownloadIcon />}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            startIcon={<PlusIcon />}
          >
            New Customer
          </Button>
        </div>
      </div>

      <div className="max-w-lg">
        <Input
          startIcon={<SearchIcon />}
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search by name, email or phone"
          ariaLabel="Search customers"
        />
      </div>

      {isLoading ? (
        <CustomerCardsLoading />
      ) : visibleProfiles.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleProfiles.map((profile) => (
            <CustomerCard key={profile.customer.id} profile={profile} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <h2 className="font-medium text-gray-800 dark:text-white/90">
            No customers found
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search
              ? "Try another name, email, or phone number."
              : "Create your first customer to get started."}
          </p>
        </div>
      )}

      {filteredProfiles.length > PAGE_SIZE && (
        <div className="flex justify-end">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <CustomerFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSaved={() => undefined}
      />
    </div>
  );
}

function CustomerCardsLoading() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Loading customers">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}
