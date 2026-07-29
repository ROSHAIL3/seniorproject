import type { Metadata } from "next";
import InvoicesListClient from "@/components/invoices/InvoicesListClient";
import { getInvoices } from "@/services/invoices.service";
import { getServicesFromDatabase } from "@/server/catalog.repository";

export const metadata: Metadata = {
  title: "Invoices | Senior Project",
  description: "Search and review appointment invoices",
};

export default async function InvoicesPage() {
  const invoices = await getInvoices(await getServicesFromDatabase());
  return <InvoicesListClient invoices={invoices} />;
}
