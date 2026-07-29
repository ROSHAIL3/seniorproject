import type { Appointment } from "./appointments";

export type InvoiceStatus = "Paid" | "Partially Paid" | "Unpaid";
export type PaymentKind = "Payment" | "Refund";
export type PaymentMethod = "Cash" | "Card" | "Bank Transfer" | "Other";

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

export type PaymentTransaction = {
  id: string;
  invoiceId?: string;
  appointmentId?: string;
  kind: PaymentKind;
  method: PaymentMethod;
  amountBhd: number;
  note: string;
  recordedBy: string;
  recordedAt: string;
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
  payments: PaymentTransaction[];
};

export type InvoicePaymentInput = {
  kind: PaymentKind;
  method: PaymentMethod;
  amountBhd: number;
  note: string;
  recordedBy: string;
  idempotencyKey: string;
};
