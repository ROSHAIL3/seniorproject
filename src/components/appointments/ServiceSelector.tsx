"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Input from "@/components/form/input/InputField";
import { SearchIcon, TimeIcon } from "@/icons";
import { formatBhd } from "@/lib/formatters";
import type { Service, ServiceCategory } from "@/types/services";
import type { StaffMember } from "@/types/staff";

type ServiceFilter = "all" | "packages" | string;

type ServiceSelectorProps = {
  selectedService: Service | null;
  services: Service[];
  categories: ServiceCategory[];
  staffMembers: StaffMember[];
  branchId: string;
  onSelect: (service: Service) => void;
};

export default function ServiceSelector({
  selectedService,
  services,
  categories,
  staffMembers,
  branchId,
  onSelect,
}: ServiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ServiceFilter>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.status === "Active"),
    [categories],
  );
  const categoryNames = useMemo(
    () =>
      new Map(activeCategories.map((category) => [category.id, category.name])),
    [activeCategories],
  );
  const availableServices = useMemo(() => {
    const branchStaffIds = new Set(
      staffMembers
        .filter((staff) => staff.isActive && staff.branchId === branchId)
        .map((staff) => staff.id),
    );
    return services.filter(
      (service) =>
        service.isActive &&
        service.staffIds.some((staffId) => branchStaffIds.has(staffId)) &&
        (service.kind === "package" ||
          activeCategories.some(
            (category) => category.id === service.categoryId,
          )),
    );
  }, [activeCategories, branchId, services, staffMembers]);

  const visibleCategoryTabs = activeCategories.filter((category) =>
    availableServices.some(
      (service) =>
        service.kind === "service" && service.categoryId === category.id,
    ),
  );

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableServices.filter((service) => {
      if (activeFilter === "packages" && service.kind !== "package") {
        return false;
      }
      if (activeFilter === "all" && service.kind !== "service") {
        return false;
      }
      if (
        activeFilter !== "all" &&
        activeFilter !== "packages" &&
        (service.kind !== "service" || service.categoryId !== activeFilter)
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      const category =
        service.kind === "package"
          ? "Packages"
          : categoryNames.get(service.categoryId) ?? "";
      return [
        service.name,
        category,
        service.description,
        `${service.durationMinutes}`,
        `${service.durationMinutes} minutes`,
        `${service.priceBhd}`,
        service.priceBhd.toFixed(3),
        `${service.priceBhd.toFixed(3)} BHD`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    activeFilter,
    availableServices,
    categoryNames,
    query,
  ]);

  const groups = useMemo(() => {
    if (activeFilter === "packages") {
      return filteredServices.length
        ? [{ id: "packages", name: "Packages", services: filteredServices }]
        : [];
    }
    return activeCategories.flatMap((category) => {
      const categoryServices = filteredServices.filter(
        (service) => service.categoryId === category.id,
      );
      return categoryServices.length
        ? [
            {
              id: category.id,
              name: category.name,
              services: categoryServices,
            },
          ]
        : [];
    });
  }, [activeCategories, activeFilter, filteredServices]);

  const openChooser = (filter: ServiceFilter = "all") => {
    setActiveFilter(filter);
    setQuery("");
    setIsOpen(true);
    requestAnimationFrame(() => setIsVisible(true));
  };
  const closeChooser = () => {
    setIsVisible(false);
    window.setTimeout(() => setIsOpen(false), 180);
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeChooser();
    };
    document.addEventListener("keydown", handleEscape);
    window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const modal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`dashboard-shell fixed inset-0 z-[100000] flex items-center justify-center p-3 transition-colors duration-200 sm:p-6 ${
              isVisible ? "bg-gray-950/60" : "bg-gray-950/0"
            }`}
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeChooser();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="service-chooser-title"
              className={`relative flex max-h-[75vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl transition duration-200 ease-out dark:border-gray-800 dark:bg-gray-900 ${
                isVisible
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-2 scale-[0.98] opacity-0"
              }`}
            >
              <div className="shrink-0 border-b border-gray-200 p-4 pr-14 dark:border-gray-800 sm:p-5 sm:pr-16">
                <h2
                  id="service-chooser-title"
                  className="text-xl font-semibold text-gray-900 dark:text-white"
                >
                  Choose a Service
                </h2>
                <button
                  type="button"
                  onClick={closeChooser}
                  aria-label="Close service chooser"
                  className="absolute right-4 top-4 inline-flex size-9 items-center justify-center overflow-visible rounded-full bg-gray-100 text-gray-500 leading-none outline-none transition hover:bg-gray-200 hover:text-gray-800 focus-visible:ring-3 focus-visible:ring-brand-500/20 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-5 sm:top-5 [&>svg]:block [&>svg]:shrink-0 [&>svg]:overflow-visible"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
                <div className="mt-4">
                  <Input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search services..."
                    ariaLabel="Search services"
                    startIcon={<SearchIcon />}
                  />
                </div>
                <div
                  className="custom-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1"
                  aria-label="Service categories"
                >
                  <FilterTab
                    active={activeFilter === "all"}
                    onClick={() => setActiveFilter("all")}
                  >
                    All Services
                  </FilterTab>
                  {visibleCategoryTabs.map((category) => (
                    <FilterTab
                      key={category.id}
                      active={activeFilter === category.id}
                      onClick={() => setActiveFilter(category.id)}
                    >
                      {category.name}
                    </FilterTab>
                  ))}
                  <FilterTab
                    active={activeFilter === "packages"}
                    onClick={() => setActiveFilter("packages")}
                  >
                    Packages
                  </FilterTab>
                </div>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {groups.length ? (
                  <div className="space-y-5">
                    {groups.map((group) => (
                      <section key={group.id}>
                        <h3 className="mb-2.5 text-sm font-semibold text-gray-800 dark:text-white/90">
                          {group.name}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {group.services.map((item) => {
                            const isSelected = selectedService?.id === item.id;
                            return (
                              <button
                                type="button"
                                key={item.id}
                                aria-pressed={isSelected}
                                onClick={() => {
                                  onSelect(item);
                                  closeChooser();
                                }}
                                className={`group min-h-[132px] rounded-xl border p-4 text-left outline-none transition focus-visible:ring-3 focus-visible:ring-brand-500/20 ${
                                  isSelected
                                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/15 dark:bg-brand-500/10"
                                    : "border-gray-200 bg-white hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-brand-700"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                      {item.name}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                                      {item.kind === "package"
                                        ? "Package"
                                        : categoryNames.get(item.categoryId)}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <span className="shrink-0 rounded-full bg-brand-500 px-2 py-1 text-[10px] font-semibold text-white">
                                      Selected
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                                  <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                    <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-visible leading-none [&>svg]:block [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:overflow-visible">
                                      <TimeIcon />
                                    </span>
                                    {item.durationMinutes} minutes
                                  </span>
                                  <span className="font-semibold text-gray-800 dark:text-white/90">
                                    {formatBhd(item.priceBhd)}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    {item.description}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-52 flex-col items-center justify-center text-center">
                    <span className="flex size-12 items-center justify-center overflow-visible rounded-full bg-gray-100 text-gray-400 leading-none dark:bg-gray-800 [&>svg]:block [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:overflow-visible">
                      <SearchIcon />
                    </span>
                    <p className="mt-3 font-semibold text-gray-800 dark:text-white/90">
                      No services found
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try another service name or category.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="w-full">
      {selectedService ? (
        <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 p-1.5 shadow-theme-xs dark:border-brand-500/40 dark:bg-brand-500/10">
          <button
            type="button"
            onClick={() =>
              openChooser(
                selectedService.kind === "package" ? "packages" : "all",
              )
            }
            className="min-w-0 flex-1 truncate rounded-md px-2.5 text-left text-sm font-semibold text-gray-900 outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20 dark:text-white"
          >
            {selectedService.name}
          </button>
          <button
            type="button"
            onClick={() =>
              openChooser(
                selectedService.kind === "package" ? "packages" : "all",
              )
            }
            aria-label={`Edit selected service: ${selectedService.name}`}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-brand-300 bg-white px-3 text-xs font-semibold text-brand-700 outline-none transition hover:bg-brand-100 focus-visible:ring-3 focus-visible:ring-brand-500/20 dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500/15"
          >
            Edit
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openChooser("all")}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-theme-xs outline-none transition hover:bg-brand-600 focus-visible:ring-3 focus-visible:ring-brand-500/30"
        >
          Choose Service
        </button>
      )}
      {modal}
    </div>
  );
}

function FilterTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-3 focus-visible:ring-brand-500/20 ${
        active
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-700 dark:hover:text-brand-400"
      }`}
    >
      {children}
    </button>
  );
}
