import "server-only";

import { getAppointmentsFromDatabase } from "./appointments.repository";
import {
  getCustomerCustomValuesFromDatabase,
  getCustomerFromDatabase,
  getCustomersFromDatabase,
} from "./customers.repository";
import { getInvoicesFromDatabase } from "./invoices.repository";
import type { Appointment } from "@/types/appointments";
import type { Customer, CustomerProfile } from "@/types/customers";

export async function getCustomerProfilesFromDatabase(): Promise<CustomerProfile[]> {
  const [customers, appointments, invoices] = await Promise.all([
    getCustomersFromDatabase(),
    getAppointmentsFromDatabase(),
    getInvoicesFromDatabase(),
  ]);
  return Promise.all(
    customers.map(async (customer) =>
      build(customer, appointments, invoices, await customRecords(customer)),
    ),
  );
}

export async function getCustomerProfileFromDatabase(customerId: string) {
  const [customer, appointments, invoices] = await Promise.all([
    getCustomerFromDatabase(customerId),
    getAppointmentsFromDatabase(),
    getInvoicesFromDatabase(),
  ]);
  return customer
    ? build(customer, appointments, invoices, await customRecords(customer))
    : null;
}

async function customRecords(customer: Customer) {
  const values = await getCustomerCustomValuesFromDatabase(customer.id);
  return Object.entries(values).map(([fieldId, value]) => ({
    customerId: customer.id,
    fieldId,
    updatedAt: customer.updatedAt,
    value,
  }));
}

function build(
  customer: Customer,
  appointments: Appointment[],
  invoices: Awaited<ReturnType<typeof getInvoicesFromDatabase>>,
  customFieldValues: CustomerProfile["customFieldValues"],
): CustomerProfile {
  const customerAppointments = appointments
    .filter((appointment) => appointment.customerId === customer.id)
    .sort((a, b) =>
      `${b.appointmentDate}T${b.startTime}`.localeCompare(
        `${a.appointmentDate}T${a.startTime}`,
      ),
    );
  const completed = customerAppointments.filter(
    (appointment) => appointment.status === "Completed",
  );
  return {
    appointments: customerAppointments,
    customer,
    customFieldValues,
    lastVisit: completed[0]?.appointmentDate ?? null,
    noShows: customerAppointments.filter(
      (appointment) => appointment.status === "No Show",
    ).length,
    totalSpentBhd: invoices
      .filter((invoice) => invoice.customerId === customer.id)
      .reduce((total, invoice) => total + invoice.amountPaidBhd, 0),
    totalVisits: completed.length,
  };
}
