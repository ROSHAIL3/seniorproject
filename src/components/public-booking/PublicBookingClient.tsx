"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/common/BrandLogo";
import type {
  PublicFieldDefinition,
  PublicBookingPageData,
  PublicBookingService,
  PublicBookingSlot,
} from "@/types/public-booking";

type Props = {
  page: PublicBookingPageData;
};

const inputClass =
  "h-11 w-full rounded-xl border border-[#d5d5cf] bg-white px-3.5 text-sm text-[#191a23] outline-none transition placeholder:text-gray-400 focus:border-[#191a23] focus:ring-3 focus:ring-[#b9ff66]/40";

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
  const [customerFieldValues, setCustomerFieldValues] = useState<
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

  const chooseDate = (value: string) => {
    setDate(value);
    setSlot(null);
    setFormError("");
  };

  const submit = async () => {
    setFormError("");
    const missingCustomerField = page.customerFields.find(
      (field) =>
        field.required && isEmptyField(field, customerFieldValues[field.id]),
    );
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
    if (missingCustomerField) {
      setFormError(`${missingCustomerField.label} is required.`);
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
            customerFieldValues,
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
  const quickDates = Array.from({ length: 7 }, (_, index) =>
    moveDate(minDate, index),
  );

  if (!page.bookingReady) {
    return <BookingUnavailable page={page} />;
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3] text-[#191a23]">
      <BookingHeader page={page} />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-10">
        <section className="space-y-5">
          <div>
            <p className="inline-flex rounded-md bg-[#b9ff66] px-2 py-1 text-sm font-semibold text-[#191a23]">
              Appointment request
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Request your appointment
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Choose a date, service and available time. Your request will be
              held for the business to review and confirm.
            </p>
          </div>

          <BookingSection number="1" title="Choose an appointment date">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {quickDates.map((quickDate) => (
                <button
                  key={quickDate}
                  type="button"
                  aria-pressed={date === quickDate}
                  onClick={() => chooseDate(quickDate)}
                  className={`min-h-[72px] rounded-2xl border px-2 py-2 text-center transition ${
                    date === quickDate
                      ? "border-[#191a23] bg-[#191a23] text-white shadow-[0_3px_0_#b9ff66]"
                      : "border-[#d5d5cf] bg-white hover:border-[#191a23]"
                  }`}
                >
                  <span className="block text-[11px] font-medium uppercase tracking-wide opacity-70">
                    {formatDatePart(quickDate, "weekday")}
                  </span>
                  <span className="mt-0.5 block text-lg font-semibold leading-none">
                    {formatDatePart(quickDate, "day")}
                  </span>
                  <span className="mt-1 block text-[11px] opacity-70">
                    {formatDatePart(quickDate, "month")}
                  </span>
                </button>
              ))}
            </div>
            <label className="mt-4 block max-w-sm text-sm font-medium">
              Choose another date
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(event) => chooseDate(event.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
            <p className="mt-3 text-xs text-gray-500">
              Selected: {formatSelectedDate(date)}
            </p>
          </BookingSection>

          <BookingSection number="2" title="Choose a branch">
            {page.branches.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {page.branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => chooseBranch(branch.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      branchId === branch.id
                        ? "border-[#191a23] bg-[#b9ff66]/20 ring-2 ring-[#b9ff66]/50"
                        : "border-[#d5d5cf] hover:border-[#191a23]"
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

          <BookingSection number="3" title="Choose a service">
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
                      ? "border-[#191a23] bg-[#b9ff66]/20 ring-2 ring-[#b9ff66]/50"
                      : "border-[#d5d5cf] hover:border-[#191a23]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium">{service.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-[#191a23]">
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

          <BookingSection number="4" title="Choose an available time">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f3f3f3] px-3.5 py-3 text-sm">
              <span className="text-gray-500">Appointment date</span>
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>('input[type="date"]')
                    ?.focus()
                }
                className="font-semibold underline decoration-[#b9ff66] decoration-4 underline-offset-2"
              >
                {formatSelectedDate(date)}
              </button>
            </div>
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
                              ? "border-[#191a23] bg-[#191a23] text-white"
                              : "border-[#d5d5cf] bg-white hover:border-[#191a23]"
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

          <BookingSection number="5" title="Your details">
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
              {page.customerFields.map((field) => (
                <PublicField
                  key={field.id}
                  field={field}
                  value={customerFieldValues[field.id]}
                  onChange={(value) =>
                    setCustomerFieldValues((current) => ({
                      ...current,
                      [field.id]: value,
                    }))
                  }
                />
              ))}
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
                  className="w-full rounded-xl border border-[#d5d5cf] bg-white px-3.5 py-3 text-sm text-[#191a23] outline-none transition placeholder:text-gray-400 focus:border-[#191a23] focus:ring-3 focus:ring-[#b9ff66]/40"
                  placeholder="Anything the business should know?"
                />
              </Field>
            </div>
          </BookingSection>
        </section>

        <aside className="lg:pt-[98px]">
          <div className="rounded-3xl border border-[#191a23] bg-white p-5 shadow-[0_5px_0_#191a23] lg:sticky lg:top-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Request summary</h2>
              <span className="rounded-full bg-[#b9ff66] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                Approval required
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <Summary label="Date" value={formatSelectedDate(date)} />
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
                    ? formatTime(slot.startAt, organization.timeZone)
                    : undefined
                }
              />
              <Summary label="Staff" value={slot?.staffName} />
            </dl>
            {selectedService && (
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-lg font-semibold text-[#191a23]">
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
              className="mt-5 min-h-12 w-full rounded-xl bg-[#191a23] px-4 text-sm font-semibold text-white transition hover:bg-[#2a2b35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending request…" : "Send booking request"}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-gray-400">
              This sends a request, not a confirmed appointment. Track approval
              and any changes in My Bookings.
            </p>
          </div>
        </aside>
      </div>

      <footer className="border-t border-[#d5d5cf] bg-white py-5 text-center text-xs text-gray-500">
        <span className="inline-flex items-center gap-2">Booking powered by <BrandLogo size="sm" /></span>
      </footer>
    </main>
  );
}

function BookingUnavailable({ page }: { page: PublicBookingPageData }) {
  const organization = page.organization;
  const website = normalizeWebsite(organization.website);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f3f3f3] text-[#191a23]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full bg-[#b9ff66]/35 blur-3xl sm:size-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 bottom-10 size-72 rounded-full bg-[#b9ff66]/20 blur-3xl sm:size-96"
      />
      <BookingHeader page={page} />

      <section className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid w-full grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
          <div className="min-w-0 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#191a23] bg-[#b9ff66] px-3 py-1.5 text-xs font-semibold text-[#191a23] shadow-sm">
              <span className="size-2 rounded-full bg-[#191a23]" />
              Online booking
            </span>
            <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-gray-900 sm:text-5xl lg:mx-0 lg:text-6xl">
              Your next appointment starts here.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-gray-600 sm:text-lg lg:mx-0">
              {organization.name} is preparing its online services and
              availability. The booking experience will be available here
              soon.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              {organization.businessPhone && (
                <a
                  href={`tel:${organization.businessPhone}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#191a23] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a2b35]"
                >
                  Call {organization.name}
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#191a23] bg-white px-5 text-sm font-semibold text-[#191a23] transition hover:bg-[#b9ff66]"
                >
                  Visit website
                </a>
              )}
            </div>
          </div>

          <div className="mx-auto min-w-0 w-full max-w-md rounded-[2rem] border border-[#191a23] bg-white p-5 shadow-[0_7px_0_#191a23] sm:p-7">
            <div className="flex items-center gap-4 border-b border-[#d5d5cf] pb-5">
              <OrganizationMark page={page} size="large" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {organization.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  Beauty and wellness appointments
                </p>
              </div>
            </div>
            <div className="py-7 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#b9ff66] text-[#191a23]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-8"
                  aria-hidden="true"
                >
                  <path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                  <path d="m9.5 15 1.7 1.7 3.6-4" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold">Bookings open soon</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-gray-500">
                Please check back shortly to choose a service, team member,
                date, and time.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-[#d5d5cf] pt-5 text-center text-xs text-gray-500">
              <span>Choose service</span>
              <span>Pick a time</span>
              <span>Book securely</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-[#d5d5cf] bg-white px-4 py-5 text-center text-xs text-gray-500">
        <span className="inline-flex items-center gap-2">Booking powered by <BrandLogo size="sm" /></span>
      </footer>
    </main>
  );
}

function BookingHeader({ page }: { page: PublicBookingPageData }) {
  const organization = page.organization;
  return (
    <header className="relative z-10 border-b border-[#191a23] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <OrganizationMark page={page} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold sm:text-lg">
              {organization.name}
            </p>
            <p className="text-xs text-gray-500">Online booking</p>
          </div>
        </div>
        <nav className="flex w-full gap-2 text-xs sm:w-auto sm:text-sm">
          <Link
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-xl bg-[#b9ff66] px-3 font-semibold text-[#191a23] sm:flex-none"
            href={`/book/${encodeURIComponent(organization.slug)}`}
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book Appointment</span>
          </Link>
          {organization.publicBookingEnabled && (
            <Link
              className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-center hover:bg-gray-50 sm:flex-none"
              href={`/book/${encodeURIComponent(organization.slug)}/manage`}
            >
              <span className="sm:hidden">My Bookings</span>
              <span className="hidden sm:inline">View My Bookings</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function OrganizationMark({
  page,
  size = "normal",
}: {
  page: PublicBookingPageData;
  size?: "normal" | "large";
}) {
  const organization = page.organization;
  const dimensions = size === "large" ? 60 : 48;
  const sizeClass = size === "large" ? "size-[60px]" : "size-12";
  return organization.logoUrl ? (
    <Image
      src={organization.logoUrl}
      alt={`${organization.name} logo`}
      width={dimensions}
      height={dimensions}
      unoptimized
      className={`${sizeClass} shrink-0 rounded-2xl object-cover`}
    />
  ) : (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-2xl bg-[#191a23] text-lg font-semibold text-white shadow-sm`}
    >
      {organization.name.charAt(0).toUpperCase()}
    </div>
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
    <section className="rounded-3xl border border-[#d5d5cf] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#191a23] text-sm font-semibold text-white">
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
  field: PublicFieldDefinition;
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
          className="size-4 accent-[#191a23]"
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
  if (field.type === "textarea") {
    return (
      <Field
        label={`${field.label}${field.required ? " *" : ""}`}
        className="sm:col-span-2"
      >
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-[#d5d5cf] bg-white px-3.5 py-3 text-sm text-[#191a23] outline-none transition placeholder:text-gray-400 focus:border-[#191a23] focus:ring-3 focus:ring-[#b9ff66]/40"
        />
      </Field>
    );
  }
  return (
    <Field label={`${field.label}${field.required ? " *" : ""}`}>
      <input
        type={field.type === "phone" ? "tel" : field.type}
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
  field: PublicFieldDefinition,
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

function formatSelectedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDatePart(
  value: string,
  part: "weekday" | "day" | "month",
) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    ...(part === "weekday"
      ? { weekday: "short" }
      : part === "day"
        ? { day: "numeric" }
        : { month: "short" }),
  };
  return new Intl.DateTimeFormat("en-US", options).format(
    new Date(`${value}T12:00:00Z`),
  );
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

function normalizeWebsite(value: string) {
  const website = value.trim();
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}
