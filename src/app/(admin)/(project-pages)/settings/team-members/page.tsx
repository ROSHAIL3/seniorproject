import TeamMembersPageClient from "@/components/settings/team-members/TeamMembersPageClient";
import { getBranches } from "@/services/branches.service";
import { getServices } from "@/services/services.service";
import { getTeamMembers } from "@/services/team-members.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team members | Senior Project",
};

export default async function Page() {
  const [initialMembers, branches, services] = await Promise.all([getTeamMembers(), getBranches(), getServices()]);
  return <TeamMembersPageClient initialMembers={initialMembers} branches={branches} services={services} />;
}
