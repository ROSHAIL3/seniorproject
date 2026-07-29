import type { Metadata } from "next";
import OrganizationProfileClient from "@/components/settings/organization-profile/OrganizationProfileClient";
import { getOrganizationFromDatabase } from "@/server/organization.repository";
import { getOrganizationProfileOptions } from "@/services/organization.service";

export const metadata: Metadata = {
  title: "Organization profile | Senior Project",
};

export default async function Page() {
  const [organization, options] = await Promise.all([
    getOrganizationFromDatabase(),
    getOrganizationProfileOptions(),
  ]);
  return <OrganizationProfileClient initialOrganization={organization} options={options} />;
}
