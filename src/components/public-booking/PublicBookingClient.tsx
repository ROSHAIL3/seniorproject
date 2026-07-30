"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PublicBookingField,
  PublicBookingPageData,
  PublicBookingService,
  PublicBookingSlot,
} from "@/types/public-booking";

type Props = {
  page: PublicBookingPageData;
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#7b1635] focus:ring-3 focus:ring-[#7b1635]/10";

export default function PublicBookingClient({ page }: Props) {
  const router = useRouter();
  const organization = page.organization;
  const today = useMemo(
    () => dateInTimeZone(new Date(), organization.timeZone),
    [organization.timeZone],
  );
  const minDate = organization.allowSameDayBookings
    ? today
    : moveDate(today, 1);
  const maxDate = moveDate(today, 90);
  const [branchId, setBranchId] = useState(
    page.branches.find((branch) => branch.isMain)?.id ??
      page.branches[0]?.id ??
      "",
  );
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(minDate);
  const [slot, setSlot] = useState<PublicBookingSlot | null>(null);
  const [slots, setSlots] = useState<PublicBookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldValues, setFieldValues] = useState<
    Record<string, string | boolean>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submissionId] = useState(() => crypto.randomUUID());

  const services = useMemo(
    () =>
      page.services.filter(
        (service) =>
          service.branchIds.includes(branchId) &&
          `${service.name} ${service.description}`
            .toLowerCase()
            .includes(serviceSearch.trim().toLowerCase()),
      ),
    [branchId, page.services, serviceSearch],
  );
  const selectedService =
    page.services.find((service) => service.id === serviceId) ?? null;
  const selectedBranch =
    page.branches.find((branch) => branch.id === branchId) ?? null;
  const selectedFields = page.serviceFields.filter(
    (field) => field.serviceId === serviceId,
  );

  useEffect(() => {
    if (!branchId || !serviceId || !date) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoadingSlots(true);
      setSlotError("");
      setSlot(null);
      try {
        const query = new URLSearchParams({ branchId, date, serviceId });
        const response = await fetch(
          `/api/public-booking/${encodeURIComponent(organization.slug)}/availability?${query}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? "Availability could not be loaded.");
        }
        setSlots(body.slots as PublicBookingSlot[]);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSlots([]);
          setSlotError(
            error instanceof Error
              ? error.message
              : "Availability could not be loaded.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [branchId, date, organization.slug, serviceId]);

  const chooseBranch = (value: string) => {
    setBranchId(value);
    setServiceId("");
    setFieldValues({});
    setSlot(null);
    setFormError("");
  };

  const chooseService = (service: PublicBookingService) => {
    setServiceId(service.id);
    setFieldValues({});
    setSlot(null);
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    const missingField = selectedFields.find(
      (field) => field.required && isEmptyField(field, fieldValues[field.id]),
    );
    if (
      !selectedBranch ||
      !selectedService ||
      !slot ||
      !customerName.trim() ||
      !customerPhone.trim()
    ) {
      setFormError("Choose a service and time, then enter your name and phone.");
      return;
    }
    if (missingField) {
      setFormError(`${missingField.label} is required.`);
      return;
    }
    if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail.trim())) {
      setFormError("Enter a valid email address or leave it empty.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/public-booking/${encodeURIComponent(organization.slug)}/bookings`,
        {
          body: JSON.stringify({
            branchId,
            customerEmail: customerEmail.trim(),
            customerName: customerName.trim(),
            customerNotes: notes.trim(),
            customerPhone: customerPhone.trim(),
            serviceFieldValues: fieldValues,
            serviceId,
            staffKey: slot.staffKey,
            startAt: slot.startAt,
            submissionId,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "The appointment could not be booked.");
      }
      router.push(
        `/book/${encodeURIComponent(organization.slug)}/confirmation?token=${encodeURIComponent(body.referenceToken)}`,
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The appointment could not be booked.",
      );
      setSubmitting(false);
    }
  };

  const groupedSlots = groupSlots(slots);

  return (
    <main className="min-h-screen bg-[#fbf7f8] text-gray-900">
      <header className="border-b border-[#eadde1] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
          {organization.logoUrl ? (
            <Image
              src={organization.logoUrl}
              alt={`${organization.name} logo`}
              width={48}
              height={48}
              unoptimized
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-[#7b1635] text-lg font-semibold text-white">
              {organization.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{organization.name}</p>
            <p className="text-xs text-gray-500">Online booking</p>
          </div>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link className="rounded-xl bg-[#7b1635]/10 px-3 py-2 font-medium text-[#7b1635]" href={`/book/${encodeURIComponent(organization.slug)}`}>Book Appointment</Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-gray-50" href={`/book/${encodeURIComponent(organization.slug)}/manage`}>View My Bookings</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-10">
        <section className="space-y-5">
          <div>
            <p className="text-sm font-medium text-[#7b1635]">Book online</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Choose your appointment
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              No account is needed. Pick a service and an available time.
            </p>
          </div>

          <BookingSection number="1" title="Choose a branch">
            {page.branches.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {page.branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => chooseBranch(branch.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      branchId === branch.id
                        ? "border-[#7b1635] bg-[#7b1635]/5 ring-2 ring-[#7b1635]/10"
                        : "border-gray-200 hover:border-[#7b1635]/40"
                    }`}
                  >
                    <span className="font-medium">{branch.name}</span>
                    {branch.address && (
                      <span className="mt-1 block text-xs text-gray-500">
                        {branch.address}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyText>No active branches are available.</EmptyText>
            )}
          </BookingSection>

          <BookingSection number="2" title="Choose a service">
            <input
              value={serviceSearch}
              onChange={(event) => setServiceSearch(event.target.value)}
              className={inputClass}
              placeholder="Search services"
              aria-label="Search services"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => chooseService(service)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    serviceId === service.id
                      ? "border-[#7b1635] bg-[#7b1635]/5 ring-2 ring-[#7b1635]/10"
                      : "border-gray-200 hover:border-[#7b1635]/40"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium">{service.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-[#7b1635]">
                      {formatBhd(service.priceBhd)}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs text-gray-500">
                    {service.durationMinutes} minutes
                  </span>
                  {service.description && (
                    <span className="mt-1 line-clamp-2 block text-xs text-gray-500">
                      {service.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {branchId && !services.length && (
              <EmptyText>No matching services are available at this branch.</EmptyText>
            )}
          </BookingSection>

          <BookingSection number="3" title="Choose a date and time">
            <label className="block max-w-xs text-sm font-medium">
              Date
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
            {!selectedService ? (
              <EmptyText>Choose a service to see available times.</EmptyText>
            ) : loadingSlots ? (
              <EmptyText>Checking available times…</EmptyText>
            ) : slotError ? (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {slotError}
              </p>
            ) : groupedSlots.length ? (
              <div className="mt-4 space-y-4">
                {groupedSlots.map((group) => (
                  <div key={group.staffKey}>
                    <p className="mb-2 text-sm font-medium">{group.staffName}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.slots.map((availableSlot) => (
                        <button
                          key={availableSlot.startAt}
                          type="button"
                          onClick={() => {
                            setSlot(availableSlot);
                            setFormError("");
                          }}
                          className={`min-h-10 rounded-xl border px-3 text-sm font-medium transition ${
                            slot?.startAt === availableSlot.startAt &&
                            slot.staffKey === availableSlot.staffKey
                              ? "border-[#7b1635] bg-[#7b1635] text-white"
                              : "border-gray-200 bg-white hover:border-[#7b1635] hover:text-[#7b1635]"
                          }`}
                        >
                          {formatTime(
                            availableSlot.startAt,
                            organization.timeZone,
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>
                No times are available on this date. Try another day.
              </EmptyText>
            )}
          </BookingSection>

          <BookingSection number="4" title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone *">
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className={inputClass}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+973"
                />
              </Field>
              <Field label="Email (optional)" className="sm:col-span-2">
                <input
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                />
              </Field>
              {selectedFields.map((field) => (
                <PublicField
                  key={field.id}
                  field={field}
                  value={fieldValues[field.id]}
                  onChange={(value) =>
                    setFieldValues((current) => ({
                      ...current,
                      [field.id]: value,
                    }))
                  }
                />
              ))}
              <Field label="Notes (optional)" className="sm:col-span-2">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#7b1635] focus:ring-3 focus:ring-[#7b1635]/10"
                  placeholder="Anything the business should know?"
                />
              </Field>
            </div>
          </BookingSection>
        </section>

        <aside className="lg:pt-[98px]">
          <div className="rounded-3xl border border-[#eadde1] bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold">Booking summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Summary label="Branch" value={selectedBranch?.name} />
              <Summary label="Service" value={selectedService?.name} />
              <Summary
                label="Duration"
                value={
                  selectedService
                    ? `${selectedService.durationMinutes} minutes`
                    : undefined
                }
              />
              <Summary
                label="Time"
                value={
                  slot
                    ? `${formatDate(slot.startAt, organization.timeZone)} at ${formatTime(slot.startAt, organization.timeZone)}`
                    : undefined
                }
              />
              <Summary label="Staff" value={slot?.staffName} />
            </dl>
            {selectedService && (
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-semibold text-[#7b1635]">
                  {formatBhd(selectedService.priceBhd)}
                </span>
              </div>
            )}
            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {formError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="mt-5 min-h-12 w-full rounded-xl bg-[#7b1635] px-4 text-sm font-semibold text-white transition hover:bg-[#64112b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Booking…"
                : organization.autoConfirmAppointments
                  ? "Confirm appointment"
                  : "Request appointment"}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-gray-400">
              {organization.autoConfirmAppointments
                ? "Your appointment will be confirmed immediately."
                : "The business will review your appointment request."}
            </p>
          </div>
        </aside>
      </div>

      <footer className="border-t border-[#eadde1] bg-white py-5 text-center text-xs text-gray-400">
        Booking powered by Slotova
      </footer>
    </main>
  );
}

function BookingSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#eadde1] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#7b1635] text-sm font-semibold text-white">
          {number}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function PublicField({
  field,
  value,
  onChange,
}: {
  field: PublicBookingField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-3.5 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-[#7b1635]"
        />
        <span>
          {field.label}
          {field.required ? " *" : ""}
        </span>
      </label>
    );
  }
  if (field.type === "dropdown") {
    return (
      <Field label={`${field.label}${field.required ? " *" : ""}`}>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Select an option</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={`${field.label}${field.required ? " *" : ""}`}>
      <input
        type={field.type}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{value || "Not selected"}</dd>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
      {children}
    </p>
  );
}

function isEmptyField(
  field: PublicBookingField,
  value: string | boolean | undefined,
) {
  return field.type === "checkbox" ? value !== true : !String(value ?? "").trim();
}

function groupSlots(slots: PublicBookingSlot[]) {
  const groups = new Map<
    string,
    { staffKey: string; staffName: string; slots: PublicBookingSlot[] }
  >();
  for (const slot of slots) {
    const group = groups.get(slot.staffKey) ?? {
      staffKey: slot.staffKey,
      staffName: slot.staffName,
      slots: [],
    };
    group.slots.push(slot);
    groups.set(slot.staffKey, group);
  }
  return [...groups.values()];
}

function formatBhd(value: number) {
  return `${Number(value).toFixed(3)} BHD`;
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone,
    year: "numeric",
  }).format(new Date(value));
}

function dateInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function moveDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
