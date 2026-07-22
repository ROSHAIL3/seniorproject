import type { Metadata } from "next";
import NewAppointmentClient from "@/components/appointments/NewAppointmentClient";
import { getAppointments } from "@/services/appointments.service";
import { getCustomers } from "@/services/customers.service";
import { getBookableServices, getServiceById } from "@/services/services.service";
import { getPackageBookingOfferings, getPackageById, packageToBookingService } from "@/services/packages.service";
import { getStaffMembers } from "@/services/staff.service";
import { getAppointmentServiceFieldValues, getServiceBookingFields } from "@/services/service-booking-fields.service";

type NewAppointmentPageProps = {
  searchParams: Promise<{ edit?: string; date?: string }>;
};

export const metadata: Metadata = {
  title: "Book Appointment | Senior Project",
};

export default async function NewAppointmentPage({
  searchParams,
}: NewAppointmentPageProps) {
  const { edit, date } = await searchParams;
  const [appointments, customers, catalogServices, packageOfferings, staffMembers] = await Promise.all([
    getAppointments(),
    getCustomers(),
    getBookableServices(),
    getPackageBookingOfferings(),
    getStaffMembers(),
  ]);
  const services = [...catalogServices, ...packageOfferings];
  const editingAppointment = appointments.find(
    (appointment) => appointment.bookingNumber === edit,
  );
  if (editingAppointment && !services.some((service) => service.id === editingAppointment.serviceId)) {
    const historicalService = await getServiceById(editingAppointment.serviceId);
    const historicalPackage = historicalService ? null : await getPackageById(editingAppointment.serviceId);
    if (historicalService) services.push(historicalService);
    else if (historicalPackage) services.push(await packageToBookingService(historicalPackage));
  }
  const serviceFields = (await Promise.all(services.map((service) => getServiceBookingFields(service.id)))).flat();
  const initialServiceFieldValues = editingAppointment ? await getAppointmentServiceFieldValues(editingAppointment.id) : {};

  return (
    <NewAppointmentClient
      editingAppointment={editingAppointment}
      initialAppointmentDate={date}
      appointments={appointments}
      customers={customers}
      services={services}
      staffMembers={staffMembers}
      serviceFields={serviceFields}
      initialServiceFieldValues={initialServiceFieldValues}
    />
  );
}
