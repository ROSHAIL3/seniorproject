"use client";

import { useMemo, useState } from "react";
import Input from "@/components/form/input/InputField";
import { TimeIcon } from "@/icons";
import { formatBhd } from "@/lib/formatters";
import type { Service } from "@/types/services";

type ServiceSelectorProps = {
  selectedService: Service | null;
  services: Service[];
  onSelect: (service: Service) => void;
};

export default function ServiceSelector({
  selectedService,
  services,
  onSelect,
}: ServiceSelectorProps) {
  const [query, setQuery] = useState("");
  const [activeKind, setActiveKind] = useState<"service" | "package">(
    selectedService?.kind ?? "service",
  );
  const visibleServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return services.filter(
      (service) =>
        service.kind === activeKind &&
        service.name.toLowerCase().includes(normalizedQuery),
    );
  }, [activeKind, query, services]);

  const serviceCount = services.filter(
    (service) => service.kind === "service",
  ).length;
  const packageCount = services.filter(
    (service) => service.kind === "package",
  ).length;

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Choose a service or package
        </h2>
        <div className="mt-3 flex border-b border-gray-100 dark:border-gray-800">
          {(
            [
              ["service", `Services (${serviceCount})`],
              ["package", `Packages (${packageCount})`],
            ] as const
          ).map(([kind, label]) => (
            <button
              type="button"
              key={kind}
              onClick={() => setActiveKind(kind)}
              className={`border-b-2 px-3 pb-2 text-xs font-medium transition ${
                activeKind === kind
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${activeKind === "service" ? "services" : "packages"}`}
        ariaLabel={`Search ${activeKind === "service" ? "services" : "packages"}`}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {visibleServices.map((service) => {
          const isSelected = selectedService?.id === service.id;
          return (
            <button
              type="button"
              key={service.id}
              onClick={() => onSelect(service)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/10 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <TimeIcon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {formatBhd(service.priceBhd)}
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-800 dark:text-white/90">
                {service.name}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {service.durationMinutes} minutes
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
