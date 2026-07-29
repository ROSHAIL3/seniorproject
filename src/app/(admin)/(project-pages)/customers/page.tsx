import type { Metadata } from "next";
import CustomersListClient from "@/components/customers/CustomersListClient";
import { getCustomerProfilesFromDatabase } from "@/server/customer-profiles.repository";

export const metadata: Metadata = {
  title: "Customers | Senior Project",
  description: "Search and manage appointment customers",
};

export default async function CustomersPage() {
  const profiles = await getCustomerProfilesFromDatabase();
  return <CustomersListClient initialProfiles={profiles} />;
}
