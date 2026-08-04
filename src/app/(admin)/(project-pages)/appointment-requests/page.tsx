import type { Metadata } from "next";
import AppointmentRequestsClient from "@/components/appointment-requests/AppointmentRequestsClient";
import {
  canDecideAppointmentRequestsFromDatabase,
  getAppointmentRequestsFromDatabase,
} from "@/server/appointments.repository";

export const metadata: Metadata = {
  title: "Appointment Requests",
  description: "Review and manage appointment requests submitted by customers.",
};

export default async function AppointmentRequestsPage() {
  const [requests, canDecide] = await Promise.all([
    getAppointmentRequestsFromDatabase(),
    canDecideAppointmentRequestsFromDatabase(),
  ]);
  return (
    <AppointmentRequestsClient
      initialRequests={requests}
      canDecide={canDecide}
    />
  );
}
