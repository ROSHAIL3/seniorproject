import type { Metadata } from "next";
import CustomersListClient from "@/components/customers/CustomersListClient";
import { getCustomerProfiles } from "@/services/customer-profiles.service";

export const metadata: Metadata = {
  title: "Customers | Senior Project",
  description: "Search and manage appointment customers",
};

export default async function CustomersPage() {
  const profiles = await getCustomerProfiles();
  return <CustomersListClient initialProfiles={profiles} />;
}
