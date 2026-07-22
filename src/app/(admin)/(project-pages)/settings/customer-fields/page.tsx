import type { Metadata } from "next";
import CustomerFieldsPageClient from "@/components/settings/customer-fields/CustomerFieldsPageClient";
import { getCustomerFieldDefinitions } from "@/services/customer-fields.service";

export const metadata: Metadata = {
  title: "Customer fields | Senior Project",
};

export default async function Page() {
  return <CustomerFieldsPageClient initialFields={await getCustomerFieldDefinitions()} />;
}
