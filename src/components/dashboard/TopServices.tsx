import ComponentCard from "@/components/common/ComponentCard";
import DashboardEmptyState from "./DashboardEmptyState";
import type { ServiceMetric } from "./types";

type TopServicesProps = {
  services: ServiceMetric[];
};

export default function TopServices({ services }: TopServicesProps) {
  return (
    <ComponentCard title="Top Services" className="h-full">
      {services.length > 0 ? (
        <ol className="space-y-5">
          {services.map((service, index) => (
            <li key={service.id}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {service.name}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {service.bookings} bookings
                </span>
              </div>
              <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${service.percentage}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <DashboardEmptyState
          title="No service data yet"
          description="Top services will appear after customers start booking."
        />
      )}
    </ComponentCard>
  );
}
