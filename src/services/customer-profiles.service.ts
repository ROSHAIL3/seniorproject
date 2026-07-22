import { getAppointments, synchronizeAppointmentCustomer } from "./appointments.service";
import {
  archiveCustomer,
  getCustomerById,
  getCustomers,
  permanentlyDeleteCustomer,
} from "./customers.service";
import { getInvoices } from "./invoices.service";
import type { Customer, CustomerProfile } from "@/types/customers";
import { getCustomerFieldValueRecords } from "./customer-fields.service";

export async function getCustomerProfiles(): Promise<CustomerProfile[]> {
  const [customers, appointments, invoices] = await Promise.all([
    getCustomers(),
    getAppointments(),
    getInvoices(),
  ]);

  return Promise.all(customers.map(async (customer) =>
    buildCustomerProfile(customer, appointments, invoices, await getCustomerFieldValueRecords(customer.id)),
  ));
}

export async function getCustomerProfile(
  customerId: string,
): Promise<CustomerProfile | null> {
  const [customer, appointments, invoices, customFieldValues] = await Promise.all([
    getCustomerById(customerId),
    getAppointments(),
    getInvoices(),
    getCustomerFieldValueRecords(customerId),
  ]);
  return customer
    ? buildCustomerProfile(customer, appointments, invoices, customFieldValues)
    : null;
}

export async function synchronizeCustomer(customer: Customer) {
  await synchronizeAppointmentCustomer(customer);
}

export async function removeCustomer(customerId: string): Promise<"archived" | "deleted"> {
  const appointments = await getAppointments();
  const hasAppointments = appointments.some(
    (appointment) => appointment.customerId === customerId,
  );
  if (hasAppointments) {
    await archiveCustomer(customerId);
    return "archived";
  }
  await permanentlyDeleteCustomer(customerId);
  return "deleted";
}

function buildCustomerProfile(
  customer: Customer,
  appointments: Awaited<ReturnType<typeof getAppointments>>,
  invoices: Awaited<ReturnType<typeof getInvoices>>,
  customFieldValues: CustomerProfile["customFieldValues"],
): CustomerProfile {
  const customerAppointments = appointments
    .filter((appointment) => appointment.customerId === customer.id)
    .sort((first, second) =>
      `${second.appointmentDate}T${second.startTime}`.localeCompare(
        `${first.appointmentDate}T${first.startTime}`,
      ),
    );
  const completedAppointments = customerAppointments.filter(
    (appointment) => appointment.status === "Completed",
  );
  const totalSpentBhd = invoices
    .filter((invoice) => invoice.customerId === customer.id)
    .reduce((total, invoice) => total + invoice.amountPaidBhd, 0);

  return {
    customer,
    appointments: customerAppointments,
    totalVisits: completedAppointments.length,
    noShows: customerAppointments.filter(
      (appointment) => appointment.status === "No Show",
    ).length,
    totalSpentBhd,
    lastVisit: completedAppointments[0]?.appointmentDate ?? null,
    customFieldValues,
  };
}
