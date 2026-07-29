import type { Metadata } from "next";
import NewAppointmentClient from "@/components/appointments/NewAppointmentClient";
import {
  getAppointmentsFromDatabase,
  getAppointmentServiceValuesFromDatabase,
} from "@/server/appointments.repository";
import { getCustomersFromDatabase } from "@/server/customers.repository";
import { packageToBookingService } from "@/services/packages.service";
import { getCatalogFromDatabase } from "@/server/catalog.repository";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getAppointmentSettingsFromDatabase } from "@/server/appointment-settings.repository";

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
  const [appointments, customers, catalog, staffMembers, appointmentSettings] = await Promise.all([
    getAppointmentsFromDatabase(),
    getCustomersFromDatabase(),
    getCatalogFromDatabase(),
    getStaffMembersFromDatabase(),
    getAppointmentSettingsFromDatabase(),
  ]);
  const catalogServices = catalog.services.filter((service) => service.isActive);
  const packageOfferings = await Promise.all(
    catalog.packages
      .filter((item) => item.isActive)
      .map((item) => packageToBookingService(item, catalog.services)),
  );
  const serviceCategories = catalog.categories.filter((category) => category.status === "Active");
  const services = [...catalogServices, ...packageOfferings];
  const editingAppointment = appointments.find(
    (appointment) => appointment.bookingNumber === edit,
  );
  if (editingAppointment && !services.some((service) => service.id === editingAppointment.serviceId)) {
    const historicalService = catalog.services.find((service) => service.id === editingAppointment.serviceId);
    const historicalPackage = historicalService ? null : catalog.packages.find((item) => item.id === editingAppointment.serviceId);
    if (historicalService) services.push(historicalService);
    else if (historicalPackage) services.push(await packageToBookingService(historicalPackage, catalog.services));
  }
  const serviceFields = (await Promise.all(services.map((service) => getServiceBookingFields(service.id)))).flat();
  const initialServiceFieldValues = editingAppointment
    ? await getAppointmentServiceValuesFromDatabase(editingAppointment.id)
    : {};

  return (
    <NewAppointmentClient
      editingAppointment={editingAppointment}
      initialAppointmentDate={date}
      appointments={appointments}
      customers={customers}
      services={services}
      serviceCategories={serviceCategories}
      staffMembers={staffMembers}
      serviceFields={serviceFields}
      initialServiceFieldValues={initialServiceFieldValues}
      appointmentSettings={appointmentSettings}
    />
  );
}
