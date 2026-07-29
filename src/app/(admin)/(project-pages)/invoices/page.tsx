import type { Metadata } from "next";
import InvoicesListClient from "@/components/invoices/InvoicesListClient";
import { getInvoicesFromDatabase } from "@/server/invoices.repository";

export const metadata: Metadata = {
  title: "Invoices | Senior Project",
  description: "Search and review appointment invoices",
};

export default async function InvoicesPage() {
  const invoices = await getInvoicesFromDatabase();
  return <InvoicesListClient invoices={invoices} />;
}
