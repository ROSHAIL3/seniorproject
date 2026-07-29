import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBookingConfirmation } from "@/server/public-booking.repository";

export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!query.token || !/^[0-9a-f-]{36}$/i.test(query.token)) notFound();
  const confirmation = await getPublicBookingConfirmation(
    slug,
    query.token,
  ).catch(() => null);
  if (!confirmation) notFound();

  const start = new Date(confirmation.startsAt);
  const date = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: confirmation.timeZone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: confirmation.timeZone,
  }).format(start);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf7f8] px-4 py-10 text-gray-900">
      <div className="w-full max-w-lg rounded-3xl border border-[#eadde1] bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
          ✓
        </div>
        <p className="mt-5 text-sm font-medium text-[#7b1635]">
          {confirmation.bookingNumber}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          {confirmation.status === "confirmed"
            ? "Appointment confirmed"
            : "Appointment requested"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {confirmation.status === "confirmed"
            ? `Your appointment with ${confirmation.organizationName} is confirmed.`
            : `${confirmation.organizationName} will review your request. Keep this booking number for reference.`}
        </p>
        <dl className="mt-6 space-y-3 rounded-2xl bg-gray-50 p-5 text-left text-sm">
          <Row label="Service" value={confirmation.serviceName} />
          <Row label="Branch" value={confirmation.branchName} />
          <Row label="Staff" value={confirmation.staffName} />
          <Row label="Date" value={date} />
          <Row label="Time" value={time} />
        </dl>
        <Link
          href={`/book/${encodeURIComponent(slug)}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium transition hover:border-[#7b1635] hover:text-[#7b1635]"
        >
          Book another appointment
        </Link>
        <p className="mt-6 text-xs text-gray-400">Booking powered by Slotova</p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

