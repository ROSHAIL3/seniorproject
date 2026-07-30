import type { Metadata } from "next";
import AppointmentsListClient from "@/components/appointments/AppointmentsListClient";
import { REFERENCE_TODAY } from "@/config/business";
import { getAppointmentsFromDatabase } from "@/server/appointments.repository";
import { getPendingBookingCountsFromDatabase } from "@/server/public-booking.repository";

export const metadata: Metadata = {
  title: "Appointments",
  description: "Search, filter, and manage appointments",
};

export default async function AppointmentsPage() {
  const [appointments, pending] = await Promise.all([
    getAppointmentsFromDatabase(),
    getPendingBookingCountsFromDatabase(),
  ]);
  return (
    <div className="space-y-4">
      {(pending.publicBookings > 0 || pending.reschedules > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{pending.publicBookings}</strong> public booking{pending.publicBookings === 1 ? "" : "s"} and{" "}
          <strong>{pending.reschedules}</strong> reschedule request{pending.reschedules === 1 ? "" : "s"} awaiting review.
        </div>
      )}
    <AppointmentsListClient
      initialAppointments={appointments}
      referenceToday={REFERENCE_TODAY}
    />
    </div>
  );
}
