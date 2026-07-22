import Link from "next/link";
import { ChevronLeftIcon } from "@/icons";
import { formatDisplayDate } from "@/lib/formatters";
import type { CustomerProfile } from "@/types/customers";
import CustomerAvatar from "./CustomerAvatar";
import CustomerStatusBadge from "./CustomerStatusBadge";

export default function CustomerCard({ profile }: { profile: CustomerProfile }) {
  const { customer } = profile;
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
    >
      <div className="flex items-start justify-between gap-4 bg-gray-50 p-5 dark:bg-gray-900/60">
        <CustomerAvatar name={customer.name} photoUrl={customer.photoUrl} className="size-16" />
        <CustomerStatusBadge status={customer.status} />
      </div>
      <div className="p-5">
        <h2 className="font-semibold text-gray-800 dark:text-white/90">
          {customer.name}
        </h2>
        <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
          {customer.email || "No email"}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {customer.phone}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <CardMetric label="Total visits" value={String(profile.totalVisits)} />
          <CardMetric
            label="Last visit"
            value={profile.lastVisit ? formatDisplayDate(profile.lastVisit) : "No visits"}
          />
        </div>
        <div className="mt-4 flex items-center justify-end text-sm font-medium text-brand-500">
          View customer
          <ChevronLeftIcon className="ml-1 size-4 rotate-180 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}
