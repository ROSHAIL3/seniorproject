import type { Metadata } from "next";
import CustomerDetailsClient from "@/components/customers/CustomerDetailsClient";
import { getCustomerProfile } from "@/services/customer-profiles.service";

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
  const profile = await getCustomerProfile(decodedCustomerId);

  return (
    <CustomerDetailsClient
      customerId={decodedCustomerId}
      initialProfile={profile}
    />
  );
}
