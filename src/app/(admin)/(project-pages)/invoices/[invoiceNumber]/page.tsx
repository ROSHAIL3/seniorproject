import { notFound } from "next/navigation";
import type { Metadata } from "next";
import InvoiceDetails from "@/components/invoices/InvoiceDetails";
import { getInvoiceByNumber } from "@/services/invoices.service";

export const metadata: Metadata = {
  title: "Invoice Details | Senior Project",
};

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ invoiceNumber: string }>;
}) {
  const { invoiceNumber } = await params;
  const invoice = await getInvoiceByNumber(decodeURIComponent(invoiceNumber));

  if (!invoice) notFound();

  return <InvoiceDetails invoice={invoice} />;
}
