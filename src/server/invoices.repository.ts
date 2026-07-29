import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAppointmentsFromDatabase } from "./appointments.repository";
import type { Database } from "@/types/database";
import type {
  Invoice,
  InvoicePaymentInput,
  InvoiceStatus,
  PaymentMethod,
  PaymentTransaction,
} from "@/types/invoices";

type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payment_transactions"]["Row"];

const methodFromDatabase: Record<PaymentRow["method"], PaymentMethod> = {
  bank_transfer: "Bank Transfer",
  card: "Card",
  cash: "Cash",
  other: "Other",
};
const methodToDatabase = {
  "Bank Transfer": "bank_transfer",
  Card: "card",
  Cash: "cash",
  Other: "other",
} as const;

export async function getInvoicesFromDatabase(
  client?: SupabaseClient<Database>,
): Promise<Invoice[]> {
  const supabase = client ?? (await createClient());
  const [
    { data: invoices, error },
    { data: items },
    { data: payments },
    appointments,
  ] = await Promise.all([
    supabase.from("invoices").select("*").order("issued_on", { ascending: false }),
    supabase.from("invoice_items").select("*").order("created_at"),
    supabase.from("payment_transactions").select("*").order("recorded_at"),
    getAppointmentsFromDatabase(supabase),
  ]);
  if (error) throw new Error("Invoices could not be loaded.");
  return (invoices ?? []).map((invoice) =>
    toInvoice(invoice, items ?? [], payments ?? [], appointments),
  );
}

export async function getInvoiceByNumberFromDatabase(
  invoiceNumber: string,
  client?: SupabaseClient<Database>,
) {
  return (
    (await getInvoicesFromDatabase(client)).find(
      (invoice) => invoice.invoiceNumber === invoiceNumber,
    ) ?? null
  );
}

export async function createInvoiceInDatabase(
  appointmentIds: string[],
  issuedOn: string,
  createdBy: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invoice_from_appointments", {
    target_appointment_ids: appointmentIds,
    target_created_by_name: createdBy,
    target_issued_on: issuedOn,
  });
  if (error || !data) throw new Error(invoiceError(error?.message));
  return getInvoiceByNumberFromDatabase(data.invoice_number, supabase);
}

export async function recordInvoicePaymentInDatabase(
  invoiceId: string,
  input: InvoicePaymentInput,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_invoice_payment", {
    target_amount_bhd: input.amountBhd,
    target_idempotency_key: input.idempotencyKey,
    target_invoice_id: invoiceId,
    target_kind: input.kind === "Payment" ? "payment" : "refund",
    target_method: methodToDatabase[input.method],
    target_note: input.note,
    target_recorded_by_name: input.recordedBy,
  });
  if (error) throw new Error(invoiceError(error.message));
  const invoices = await getInvoicesFromDatabase(supabase);
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) throw new Error("The invoice could not be reloaded.");
  return invoice;
}

function toInvoice(
  row: InvoiceRow,
  itemRows: Database["public"]["Tables"]["invoice_items"]["Row"][],
  paymentRows: PaymentRow[],
  appointments: Awaited<ReturnType<typeof getAppointmentsFromDatabase>>,
): Invoice {
  const invoiceItems = itemRows.filter((item) => item.invoice_id === row.id);
  const payments = paymentRows
    .filter((payment) => payment.invoice_id === row.id)
    .map(toPayment);
  const amountPaidBhd = payments.reduce(
    (total, payment) =>
      total + (payment.kind === "Payment" ? payment.amountBhd : -payment.amountBhd),
    0,
  );
  const totalBhd = Number(row.total_bhd);
  return {
    amountPaidBhd,
    appointmentIds: invoiceItems.map((item) => item.appointment_id),
    appointments: appointments.filter((appointment) =>
      invoiceItems.some((item) => item.appointment_id === appointment.id),
    ),
    createdAt: row.created_at,
    createdBy: row.created_by_name,
    customerEmail: row.customer_email,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    id: row.id,
    invoiceNumber: row.invoice_number,
    issuedOn: row.issued_on,
    items: invoiceItems.map((item) => ({
      appointmentId: item.appointment_id,
      description: item.description,
      id: item.id,
      quantity: item.quantity,
      serviceId: item.service_id ?? "",
      totalBhd: Number(item.line_total_bhd),
      unitPriceBhd: Number(item.unit_price_bhd),
    })),
    payments,
    remainingBalanceBhd: Math.max(totalBhd - amountPaidBhd, 0),
    status: invoiceStatus(totalBhd, amountPaidBhd),
    subtotalBhd: Number(row.subtotal_bhd),
    totalBhd,
    updatedAt: row.updated_at,
    vatBhd: Number(row.vat_bhd),
    vatRate: row.vat_enabled ? Number(row.vat_rate_percent) / 100 : 0,
  };
}

function toPayment(row: PaymentRow): PaymentTransaction {
  return {
    amountBhd: Number(row.amount_bhd),
    appointmentId: row.appointment_id ?? undefined,
    id: row.id,
    invoiceId: row.invoice_id ?? undefined,
    kind: row.kind === "payment" ? "Payment" : "Refund",
    method: methodFromDatabase[row.method],
    note: row.note,
    recordedAt: row.recorded_at,
    recordedBy: row.recorded_by_name,
  };
}

function invoiceStatus(total: number, paid: number): InvoiceStatus {
  if (paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Unpaid";
}

function invoiceError(message = "") {
  const errors: [string, string][] = [
    ["INVOICE_FORBIDDEN", "You do not have permission to create invoices."],
    ["PAYMENT_FORBIDDEN", "You do not have permission to record payments."],
    ["APPOINTMENT_ALREADY_INVOICED", "One of the selected appointments already has an invoice."],
    ["INVOICE_CUSTOMER_MISMATCH", "All invoice appointments must belong to the same customer."],
    ["INVOICE_APPOINTMENT_INVALID", "Cancelled or missing appointments cannot be invoiced."],
    ["PAYMENT_EXCEEDS_BALANCE", "The payment exceeds the remaining invoice balance."],
    ["REFUND_EXCEEDS_PAID", "The refund exceeds the amount paid."],
    ["INVOICE_NOT_FOUND", "The invoice could not be found."],
    ["PAYMENT_INVALID", "Enter a valid payment or refund amount."],
  ];
  return errors.find(([code]) => message.includes(code))?.[1] ??
    "The invoice operation could not be completed.";
}
