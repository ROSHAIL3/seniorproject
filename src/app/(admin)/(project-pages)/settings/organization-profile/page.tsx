import type { Metadata } from "next";
import OrganizationProfileClient from "@/components/settings/organization-profile/OrganizationProfileClient";
import { getOrganization, getOrganizationProfileOptions } from "@/services/organization.service";

export const metadata: Metadata = {
  title: "Organization profile | Senior Project",
};

export default async function Page() {
  const [organization, options] = await Promise.all([getOrganization(), getOrganizationProfileOptions()]);
  return <OrganizationProfileClient initialOrganization={organization} options={options} />;
}
