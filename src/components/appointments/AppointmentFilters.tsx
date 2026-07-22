import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { DownloadIcon, PlusIcon, SearchIcon } from "@/icons";
import type { DateFilter } from "./types";

type AppointmentFiltersProps = {
  search: string;
  dateFilter: DateFilter;
  onSearchChange: (value: string) => void;
  onDateFilterChange: (value: DateFilter) => void;
  onExport: () => void;
};

const dateOptions = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All" },
];

export default function AppointmentFilters({
  search,
  dateFilter,
  onSearchChange,
  onDateFilterChange,
  onExport,
}: AppointmentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
      <div className="w-full xl:w-[360px]">
        <Input
          startIcon={<SearchIcon />}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search booking #, customer, phone or email"
          ariaLabel="Search appointments"
        />
      </div>
      <div className="w-full sm:w-48">
        <Select
          key={dateFilter}
          options={dateOptions}
          defaultValue={dateFilter}
          onChange={(value) => onDateFilterChange(value as DateFilter)}
          className="bg-white dark:bg-gray-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <Button
          size="sm"
          variant="outline"
          onClick={onExport}
          startIcon={<DownloadIcon />}
          className="w-full whitespace-nowrap sm:w-auto"
        >
          Export CSV
        </Button>
        <Button
          size="sm"
          href="/appointments/new"
          startIcon={<PlusIcon />}
          className="w-full sm:w-auto"
        >
          New Appointment
        </Button>
      </div>
    </div>
  );
}
