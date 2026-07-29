import type {
  Invoice,
  InvoicePaymentInput,
  InvoiceStatus,
} from "@/types/invoices";
import type { Service } from "@/types/services";

export async function getInvoices(_services?: Service[]): Promise<Invoice[]> {
  void _services;
  return (await invoiceRequest("/api/invoices")).invoices;
}

export async function getInvoiceByNumber(
  invoiceNumber: string,
  _services?: Service[],
) {
  void _services;
  return (
    (await getInvoices()).find(
      (invoice) => invoice.invoiceNumber === invoiceNumber,
    ) ?? null
  );
}

export async function createInvoiceFromAppointments(
  appointmentIds: string[],
  createdBy: string,
  issuedOn = localDate(new Date()),
) {
  return (
    await invoiceRequest("/api/invoices", {
      body: JSON.stringify({ appointmentIds, createdBy, issuedOn }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  ).invoice as Invoice;
}

export async function recordInvoicePayment(
  invoiceId: string,
  input: Omit<InvoicePaymentInput, "idempotencyKey"> & {
    idempotencyKey?: string;
  },
) {
  return (
    await invoiceRequest(
      `/api/invoices/${encodeURIComponent(invoiceId)}/payments`,
      {
        body: JSON.stringify({
          ...input,
          idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    )
  ).invoice as Invoice;
}

export function calculateInvoiceStatus(
  totalBhd: number,
  amountPaidBhd: number,
): InvoiceStatus {
  if (amountPaidBhd >= totalBhd) return "Paid";
  if (amountPaidBhd > 0) return "Partially Paid";
  return "Unpaid";
}

async function invoiceRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Invoice request failed.");
  return body;
}

function localDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}
