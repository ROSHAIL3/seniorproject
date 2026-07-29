import type { Metadata } from "next";
import CustomerDetailsClient from "@/components/customers/CustomerDetailsClient";
import { getCustomerProfileFromDatabase } from "@/server/customer-profiles.repository";

export const metadata: Metadata = {
  title: "Customer Details | Senior Project",
};

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const decodedCustomerId = decodeURIComponent(customerId);
  const profile = await getCustomerProfileFromDatabase(decodedCustomerId);

  return (
    <CustomerDetailsClient
      customerId={decodedCustomerId}
      initialProfile={profile}
    />
  );
}
