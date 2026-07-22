import type { Appointment } from "./appointments";

export type InvoiceStatus = "Paid" | "Partially Paid" | "Unpaid";

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  appointmentIds: string[];
  amountPaidBhd: number;
  vatRate: number;
  createdBy: string;
  issuedOn: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceItem = {
  id: string;
  appointmentId: string;
  serviceId: string;
  description: string;
  quantity: number;
  unitPriceBhd: number;
  totalBhd: number;
};

export type Invoice = InvoiceRecord & {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: InvoiceItem[];
  appointments: Appointment[];
  subtotalBhd: number;
  vatBhd: number;
  totalBhd: number;
  remainingBalanceBhd: number;
  status: InvoiceStatus;
};
