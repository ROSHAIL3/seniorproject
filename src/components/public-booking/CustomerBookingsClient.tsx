"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandLogo from "@/components/common/BrandLogo";
import type {
  CustomerBookingItem,
  CustomerBookingPage,
  CustomerBookingScope,
  PublicBookingPageData,
  PublicBookingSlot,
} from "@/types/public-booking";

type Props = {
  page: PublicBookingPageData;
  initiallyAuthenticated: boolean;
};

const scopes: { id: CustomerBookingScope; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "Completed / History" },
  { id: "cancelled", label: "Cancelled" },
];
const inputClass =
  "h-11 w-full rounded-xl border border-[#d5d5cf] bg-white px-3.5 text-sm outline-none focus:border-[#191a23] focus:ring-3 focus:ring-[#b9ff66]/40";
const currentAccessCodePattern = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
const legacyAccessCodePattern = /^[A-F0-9-]{12,14}$/;

function normalizeAccessCodeInput(value: string) {
  return value.replace(/\s/g, "").toUpperCase().slice(0, 14);
}

function canSubmitAccessCode(value: string) {
  return (
    currentAccessCodePattern.test(value) ||
    (legacyAccessCodePattern.test(value) &&
      value.replace(/[^A-F0-9]/g, "").length === 12)
  );
}

export default function CustomerBookingsClient({
  page,
  initiallyAuthenticated,
}: Props) {
  const slug = page.organization.slug;
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [scope, setScope] = useState<CustomerBookingScope>("upcoming");
  const [bookings, setBookings] = useState<CustomerBookingItem[]>([]);
  const [cursor, setCursor] = useState<CustomerBookingPage["nextCursor"]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rescheduling, setRescheduling] = useState<CustomerBookingItem | null>(
    null,
  );

  const load = async (append = false) => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ scope });
    if (append && cursor) {
      query.set("cursorStartsAt", cursor.startsAt);
      query.set("cursorId", cursor.id);
    }
    try {
      const response = await fetch(
        `/api/public-booking/${encodeURIComponent(slug)}/me/bookings?${query}`,
        { cache: "no-store" },
      );
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      const body = (await response.json()) as CustomerBookingPage & {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Bookings could not be loaded.");
      setBookings((current) => (append ? [...current, ...body.items] : body.items));
      setCursor(body.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bookings could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) void load();
    // load is intentionally scoped to the selected section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, scope]);

  const login = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/public-booking/${encodeURIComponent(slug)}/session`,
        {
          body: JSON.stringify({ accessCode, phone }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Access could not be verified.");
      setAuthenticated(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Access could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  const forget = async () => {
    await fetch(`/api/public-booking/${encodeURIComponent(slug)}/session`, {
      method: "DELETE",
    });
    setBookings([]);
    setAuthenticated(false);
  };

  const cancel = async (booking: CustomerBookingItem) => {
    if (!window.confirm(`Cancel appointment ${booking.bookingNumber}?`)) return;
    setLoading(true);
    setError("");
    const response = await fetch(
      `/api/public-booking/${encodeURIComponent(slug)}/me/appointments/${booking.id}/cancel`,
      { method: "POST" },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "The appointment could not be cancelled.");
    else {
      if (body.refundReviewRequired) {
        window.alert("Cancelled. The business must review your advance payment manually.");
      }
      await load();
    }
    setLoading(false);
  };

  if (!authenticated) {
    return (
      <PublicShell page={page}>
        <div className="mx-auto max-w-md rounded-3xl border border-[#191a23] bg-white p-6 shadow-[0_6px_0_#191a23] sm:p-8">
          <p className="inline-flex rounded-md bg-[#b9ff66] px-2 py-1 text-sm font-semibold text-[#191a23]">Customer access</p>
          <h1 className="mt-1 text-2xl font-semibold">View my bookings</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Enter the phone number used for booking and the access code shown on
            any confirmation from this business.
          </p>
          <label className="mt-6 block text-sm font-medium">
            Phone number
            <input
              className={`${inputClass} mt-2`}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Access code
            <input
              className={`${inputClass} mt-2 font-mono uppercase tracking-wider`}
              value={accessCode}
              onChange={(event) =>
                setAccessCode(normalizeAccessCodeInput(event.target.value))
              }
              autoComplete="one-time-code"
              maxLength={14}
              placeholder="7KX4PM"
              spellCheck={false}
            />
            <span className="mt-1.5 block text-xs font-normal text-gray-500">
              Enter the six-character code from your confirmation.
            </span>
          </label>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <button
            className="mt-5 min-h-11 w-full rounded-xl bg-[#191a23] px-4 text-sm font-semibold text-white transition hover:bg-[#2a2b35] disabled:opacity-60"
            disabled={loading || !phone.trim() || !canSubmitAccessCode(accessCode)}
            onClick={() => void login()}
          >
            {loading ? "Verifying…" : "View bookings"}
          </button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell page={page}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex rounded-md bg-[#b9ff66] px-2 py-1 text-sm font-semibold text-[#191a23]">Customer area</p>
          <h1 className="mt-1 text-3xl font-semibold">My bookings</h1>
        </div>
        <button className="text-sm text-gray-500 underline" onClick={() => void forget()}>
          Forget this device
        </button>
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {scopes.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setBookings([]);
              setCursor(null);
              setScope(item.id);
            }}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ${
              scope === item.id ? "bg-[#191a23] text-white" : "border border-[#d5d5cf] bg-white text-gray-600 hover:border-[#191a23]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            timeZone={page.organization.timeZone}
            disabled={loading}
            onCancel={() => void cancel(booking)}
            onReschedule={() => setRescheduling(booking)}
          />
        ))}
        {!loading && !bookings.length && (
          <div className="rounded-3xl border border-[#d5d5cf] bg-white p-8 text-center text-sm text-gray-500">
            No bookings in this section.
          </div>
        )}
      </div>
      {loading && <p className="mt-5 text-center text-sm text-gray-500">Loading…</p>}
      {cursor && !loading && (
        <button
          onClick={() => void load(true)}
          className="mx-auto mt-5 block rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium"
        >
          Load more
        </button>
      )}
      {rescheduling && (
        <RescheduleDialog
          booking={rescheduling}
          page={page}
          onClose={() => setRescheduling(null)}
          onSaved={async () => {
            setRescheduling(null);
            await load();
          }}
        />
      )}
    </PublicShell>
  );
}

function BookingCard({
  booking,
  timeZone,
  disabled,
  onCancel,
  onReschedule,
}: {
  booking: CustomerBookingItem;
  timeZone: string;
  disabled: boolean;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const start = new Date(booking.startsAt);
  return (
    <article className="rounded-3xl border border-[#d5d5cf] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#191a23]">{booking.bookingNumber}</p>
          <h2 className="mt-1 text-lg font-semibold">{booking.serviceName}</h2>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize">
          {booking.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <p>{formatDate(start, timeZone)}</p>
        <p>{formatTime(start, timeZone)} – {formatTime(new Date(booking.endsAt), timeZone)}</p>
        <p>{booking.branchName}</p>
        <p>{booking.staffName}</p>
      </div>
      {booking.pendingReschedule && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Reschedule awaiting approval:{" "}
          {formatDate(new Date(booking.pendingReschedule.startsAt), timeZone)} at{" "}
          {formatTime(new Date(booking.pendingReschedule.startsAt), timeZone)} with{" "}
          {booking.pendingReschedule.staffName}.
        </p>
      )}
      {booking.refundReviewRequired && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          An advance payment is attached to this cancelled appointment. The
          business must review any refund manually.
        </p>
      )}
      {(booking.canCancel || booking.canReschedule) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {booking.canReschedule && (
            <button
              disabled={disabled}
              onClick={onReschedule}
              className="rounded-xl bg-[#191a23] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2b35] disabled:opacity-50"
            >
              Request reschedule
            </button>
          )}
          {booking.canCancel && (
            <button
              disabled={disabled}
              onClick={onCancel}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function RescheduleDialog({
  booking,
  page,
  onClose,
  onSaved,
}: {
  booking: CustomerBookingItem;
  page: PublicBookingPageData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const today = useMemo(
    () => new Intl.DateTimeFormat("en-CA", {
      timeZone: page.organization.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    [page.organization.timeZone],
  );
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<PublicBookingSlot[]>([]);
  const [selected, setSelected] = useState<PublicBookingSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking.serviceId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      branchId: booking.branchId,
      date,
      serviceId: booking.serviceId,
    });
    fetch(`/api/public-booking/${encodeURIComponent(page.organization.slug)}/availability?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setSlots(body.slots);
        setSelected(null);
      })
      .catch((caught) => {
        if (caught.name !== "AbortError") setError("Availability could not be loaded.");
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [booking.branchId, booking.serviceId, date, page.organization.slug]);

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/public-booking/${encodeURIComponent(page.organization.slug)}/me/appointments/${booking.id}/reschedule`,
      {
        body: JSON.stringify({
          staffKey: selected.staffKey,
          startAt: selected.startAt,
          submissionId: crypto.randomUUID(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "The request could not be sent.");
      setBusy(false);
      return;
    }
    await onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Request reschedule</h2>
            <p className="mt-1 text-sm text-gray-500">The current slot stays reserved until approval.</p>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mt-5 grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-400">Current</p>
            <p className="mt-1 font-medium">{formatDate(new Date(booking.startsAt), page.organization.timeZone)}</p>
            <p>{formatTime(new Date(booking.startsAt), page.organization.timeZone)} · {booking.staffName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Proposed</p>
            <p className="mt-1 font-medium">{selected ? formatDate(new Date(selected.startAt), page.organization.timeZone) : "Choose below"}</p>
            <p>{selected ? `${formatTime(new Date(selected.startAt), page.organization.timeZone)} · ${selected.staffName}` : "—"}</p>
          </div>
        </div>
        <label className="mt-5 block text-sm font-medium">
          New date
          <input className={`${inputClass} mt-2`} type="date" min={today} value={date} onChange={(event) => { setBusy(true); setDate(event.target.value); }} />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={`${slot.staffKey}-${slot.startAt}`}
              onClick={() => setSelected(slot)}
              className={`rounded-xl border px-3 py-2 text-sm ${selected === slot ? "border-[#191a23] bg-[#191a23] text-white" : "border-[#d5d5cf] hover:border-[#191a23]"}`}
            >
              {formatTime(new Date(slot.startAt), page.organization.timeZone)} · {slot.staffName}
            </button>
          ))}
          {!busy && !slots.length && <p className="text-sm text-gray-500">No available times.</p>}
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
          <button disabled={!selected || busy} onClick={() => void submit()} className="rounded-xl bg-[#191a23] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2a2b35] disabled:opacity-50">
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicShell({ page, children }: { page: PublicBookingPageData; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f3f3f3] text-[#191a23]">
      <header className="border-b border-[#191a23] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            {page.organization.logoUrl ? (
              <Image
                src={page.organization.logoUrl}
                alt={`${page.organization.name} logo`}
                width={48}
                height={48}
                unoptimized
                className="size-12 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#191a23] text-lg font-semibold text-white">
                {page.organization.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold sm:text-lg">
                {page.organization.name}
              </p>
              <p className="text-xs text-gray-500">Online booking</p>
            </div>
          </div>
          <nav className="flex w-full gap-2 text-xs sm:w-auto sm:text-sm">
            <Link className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-center hover:bg-gray-50 sm:flex-none" href={`/book/${encodeURIComponent(page.organization.slug)}`}><span className="sm:hidden">Book</span><span className="hidden sm:inline">Book Appointment</span></Link>
            <Link className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-xl bg-[#b9ff66] px-3 text-center font-semibold text-[#191a23] sm:flex-none" href={`/book/${encodeURIComponent(page.organization.slug)}/manage`}><span className="sm:hidden">My Bookings</span><span className="hidden sm:inline">View My Bookings</span></Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      <footer className="mt-10 border-t border-[#d5d5cf] bg-white px-4 py-5 text-center text-xs text-gray-500">
        <span className="inline-flex items-center gap-2">Booking powered by <BrandLogo size="sm" /></span>
      </footer>
    </main>
  );
}

function formatDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(value);
}

function formatTime(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(value);
}
