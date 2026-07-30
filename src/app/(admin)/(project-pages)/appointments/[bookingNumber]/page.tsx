import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AppointmentDetailsClient from "@/components/appointments/AppointmentDetailsClient";
import {
  getAppointmentActivityFromDatabase,
  getAppointmentByBookingNumberFromDatabase,
  getAppointmentServiceValuesFromDatabase,
  getPendingRescheduleRequestFromDatabase,
} from "@/server/appointments.repository";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";
import { getServiceBookingFieldsFromDatabase } from "@/server/field-definitions.repository";

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
  const appointment = await getAppointmentByBookingNumberFromDatabase(
    decodeURIComponent(bookingNumber),
  );

  if (!appointment) notFound();

  const [staffMembers, activity, fieldValues, fieldDefinitions, rescheduleRequest] = await Promise.all([
    getStaffMembersFromDatabase(),
    getAppointmentActivityFromDatabase(appointment.id),
    getAppointmentServiceValuesFromDatabase(appointment.id),
    getServiceBookingFieldsFromDatabase(appointment.serviceId, true),
    getPendingRescheduleRequestFromDatabase(appointment.id),
  ]);
  const serviceFieldDetails = fieldDefinitions
    .filter((field) => fieldValues[field.id] !== undefined)
    .map((field) => ({ field, value: fieldValues[field.id] }));

  return (
    <AppointmentDetailsClient
      appointment={appointment}
      staffMembers={staffMembers}
      activity={activity}
      serviceFieldDetails={serviceFieldDetails}
      rescheduleRequest={rescheduleRequest}
    />
  );
}
