import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ConfirmationActions from "@/components/public-booking/ConfirmationActions";
import BrandLogo from "@/components/common/BrandLogo";
import { getPublicBookingConfirmation } from "@/server/public-booking.repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Booking confirmation",
  description: "Review your Slotova booking confirmation and access code.",
  robots: { follow: false, index: false },
};

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
  const statusCopy = {
    booked: {
      heading: "Appointment requested",
      message: `${confirmation.organizationName} will review your request. Keep this booking number for reference.`,
    },
    confirmed: {
      heading: "Appointment confirmed",
      message: `Your appointment with ${confirmation.organizationName} is confirmed.`,
    },
    completed: {
      heading: "Appointment completed",
      message: `This appointment with ${confirmation.organizationName} is complete.`,
    },
    cancelled: {
      heading: "Appointment cancelled",
      message: "This appointment is no longer scheduled.",
    },
    no_show: {
      heading: "Appointment marked as no-show",
      message: "The business recorded that this appointment was missed.",
    },
  }[confirmation.status];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-4 py-10 text-[#191a23]">
      <div className="w-full max-w-lg rounded-3xl border border-[#191a23] bg-white p-6 text-center shadow-[0_7px_0_#191a23] sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#b9ff66] text-3xl font-bold text-[#191a23]">
          ✓
        </div>
        <p className="mt-5 text-sm font-semibold text-[#191a23]">
          {confirmation.bookingNumber}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{statusCopy.heading}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {statusCopy.message}
        </p>
        <dl className="mt-6 space-y-3 rounded-2xl bg-gray-50 p-5 text-left text-sm">
          <Row label="Service" value={confirmation.serviceName} />
          <Row label="Branch" value={confirmation.branchName} />
          <Row label="Staff" value={confirmation.staffName} />
          <Row label="Date" value={date} />
          <Row label="Time" value={time} />
          <Row label="Status" value={confirmation.status.replace("_", " ")} />
        </dl>
        <div className="mt-5 rounded-2xl border border-[#191a23] bg-[#b9ff66]/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Your booking access code
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-[#191a23]">
            {confirmation.accessCode}
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Save or print this code. Together with your phone number, it lets
            you securely view all bookings with this business.
          </p>
        </div>
        <ConfirmationActions slug={slug} referenceToken={query.token} />
        <p className="mt-6 inline-flex items-center gap-2 text-xs text-gray-500">Booking powered by <BrandLogo size="sm" /></p>
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
