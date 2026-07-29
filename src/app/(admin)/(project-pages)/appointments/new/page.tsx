import type { Metadata } from "next";
import NewAppointmentClient from "@/components/appointments/NewAppointmentClient";
import { getAppointments } from "@/services/appointments.service";
import { getCustomers } from "@/services/customers.service";
import { packageToBookingService } from "@/services/packages.service";
import { getCatalogFromDatabase } from "@/server/catalog.repository";
import { getStaffMembersFromDatabase } from "@/server/staff.repository";
import { getAppointmentServiceFieldValues, getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getAppointmentSettings } from "@/services/appointment-settings.service";

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
    getAppointments(),
    getCustomers(),
    getCatalogFromDatabase(),
    getStaffMembersFromDatabase(),
    getAppointmentSettings(),
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
  const initialServiceFieldValues = editingAppointment ? await getAppointmentServiceFieldValues(editingAppointment.id) : {};

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
