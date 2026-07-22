"use client";

import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { DownloadIcon, SearchIcon } from "@/icons";
import type { InvoiceStatus } from "@/types/invoices";

export type InvoiceStatusFilter = InvoiceStatus | "all";

type InvoiceFiltersProps = {
  search: string;
  status: InvoiceStatusFilter;
  fromDate: string;
  toDate: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: InvoiceStatusFilter) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onExport: () => void;
};

const statusOptions = [
  { value: "all", label: "All payment statuses" },
  { value: "Paid", label: "Paid" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Unpaid", label: "Unpaid" },
];

export default function InvoiceFilters({
  search,
  status,
  fromDate,
  toDate,
  onSearchChange,
  onStatusChange,
  onFromDateChange,
  onToDateChange,
  onExport,
}: InvoiceFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          startIcon={<DownloadIcon />}
        >
          Export CSV
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.2fr)_minmax(200px,1fr)_minmax(170px,.75fr)_minmax(170px,.75fr)]">
        <Input
          startIcon={<SearchIcon />}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search invoice, customer, phone or email"
          ariaLabel="Search invoices"
        />
        <Select
          key={status}
          options={statusOptions}
          defaultValue={status}
          onChange={(value) => onStatusChange(value as InvoiceStatusFilter)}
          placeholder="Filter by payment status"
        />
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          ariaLabel="Invoice date from"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          ariaLabel="Invoice date to"
        />
      </div>
    </div>
  );
}
