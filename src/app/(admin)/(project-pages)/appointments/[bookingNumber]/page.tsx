import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AppointmentDetailsClient from "@/components/appointments/AppointmentDetailsClient";
import {
  getAppointmentActivity,
  getAppointmentByBookingNumber,
} from "@/services/appointments.service";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";
import { getAppointmentServiceFieldDetails } from "@/services/service-booking-fields.service";

type AppointmentDetailsPageProps = {
  params: Promise<{ bookingNumber: string }>;
};

export const metadata: Metadata = {
  title: "Appointment Details | Senior Project",
};

export default async function AppointmentDetailsPage({
  params,
}: AppointmentDetailsPageProps) {
  const { bookingNumber } = await params;
  const appointment = await getAppointmentByBookingNumber(
    decodeURIComponent(bookingNumber),
  );

  if (!appointment) notFound();

  const [staffMembers, activity, serviceFieldDetails] = await Promise.all([
    getStaffMembersFromDatabase(),
    getAppointmentActivity(appointment.id),
    getAppointmentServiceFieldDetails(appointment.id, appointment.serviceId),
  ]);

  return (
    <AppointmentDetailsClient
      appointment={appointment}
      staffMembers={staffMembers}
      activity={activity}
      serviceFieldDetails={serviceFieldDetails}
    />
  );
}
