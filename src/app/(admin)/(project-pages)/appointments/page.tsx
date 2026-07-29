import type { Metadata } from "next";
import AppointmentsListClient from "@/components/appointments/AppointmentsListClient";
import { REFERENCE_TODAY } from "@/config/business";
import { getAppointmentsFromDatabase } from "@/server/appointments.repository";

export const metadata: Metadata = {
  title: "Appointments | Senior Project",
  description: "Search, filter, and manage appointments",
};

export default async function AppointmentsPage() {
  const appointments = await getAppointmentsFromDatabase();
  return (
    <AppointmentsListClient
      initialAppointments={appointments}
      referenceToday={REFERENCE_TODAY}
    />
  );
}
