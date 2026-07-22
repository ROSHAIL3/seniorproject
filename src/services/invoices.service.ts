import { mockInvoiceRecords } from "@/data/mock/invoices";
import type {
  Invoice,
  InvoiceItem,
  InvoiceRecord,
  InvoiceStatus,
} from "@/types/invoices";
import { getAppointments } from "./appointments.service";
import { getCustomerById } from "./customers.service";
import { calculateTax, getAppointmentSettings } from "./appointment-settings.service";
import { getServices } from "./services.service";

const invoiceRecords = mockInvoiceRecords.map((invoice) => ({
  ...invoice,
  appointmentIds: [...invoice.appointmentIds],
}));

export async function getInvoices(): Promise<Invoice[]> {
  return Promise.all(invoiceRecords.map(resolveInvoice));
}

export async function getInvoiceByNumber(
  invoiceNumber: string,
): Promise<Invoice | null> {
  const record = invoiceRecords.find(
    (invoice) => invoice.invoiceNumber === invoiceNumber,
  );
  return record ? resolveInvoice(record) : null;
}

export function calculateInvoiceStatus(
  totalBhd: number,
  amountPaidBhd: number,
): InvoiceStatus {
  if (amountPaidBhd >= totalBhd) return "Paid";
  if (amountPaidBhd > 0) return "Partially Paid";
  return "Unpaid";
}

async function resolveInvoice(record: InvoiceRecord): Promise<Invoice> {
  const [allAppointments, customer, appointmentSettings, services] = await Promise.all([
    getAppointments(),
    getCustomerById(record.customerId),
    getAppointmentSettings(),
    getServices(),
  ]);
  const appointments = record.appointmentIds
    .map((appointmentId) =>
      allAppointments.find((appointment) => appointment.id === appointmentId),
    )
    .filter((appointment) => appointment !== undefined);

  if (!customer || appointments.length !== record.appointmentIds.length) {
    throw new Error(
      `Invoice ${record.invoiceNumber} has an invalid customer or appointment link.`,
    );
  }

  const items: InvoiceItem[] = appointments.map((appointment) => ({
    id: `invoice-item-${record.id}-${appointment.id}`,
    appointmentId: appointment.id,
    serviceId: appointment.serviceId,
    description: appointment.serviceName,
    quantity: 1,
    unitPriceBhd: appointment.priceBhd,
    totalBhd: appointment.priceBhd,
  }));
  const taxableTotalBhd = items.filter((item) => services.find((service) => service.id === item.serviceId)?.vatApplicable !== false).reduce((total, item) => total + item.totalBhd, 0);
  const nonTaxableTotalBhd = items.reduce((total, item) => total + item.totalBhd, 0) - taxableTotalBhd;
  const taxableBreakdown = calculateTax(taxableTotalBhd, appointmentSettings.tax);
  const subtotalBhd = taxableBreakdown.subtotalBhd + nonTaxableTotalBhd;
  const vatBhd = taxableBreakdown.vatBhd;
  const totalBhd = taxableBreakdown.totalBhd + nonTaxableTotalBhd;
  const amountPaidBhd = Math.min(Math.max(record.amountPaidBhd, 0), totalBhd);

  return {
    ...record,
    vatRate: appointmentSettings.tax.enabled ? appointmentSettings.tax.ratePercent / 100 : 0,
    appointmentIds: [...record.appointmentIds],
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    items,
    appointments,
    subtotalBhd,
    vatBhd,
    totalBhd,
    amountPaidBhd,
    remainingBalanceBhd: Math.max(totalBhd - amountPaidBhd, 0),
    status: calculateInvoiceStatus(totalBhd, amountPaidBhd),
  };
}
