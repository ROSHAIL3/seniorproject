import TeamMembersPageClient from "@/components/settings/team-members/TeamMembersPageClient";
import { getBranchesFromDatabase } from "@/server/branches.repository";
import { getServicesFromDatabase } from "@/server/catalog.repository";
import { getTeamMembersFromDatabase } from "@/server/team-members.repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team members",
};

export default async function Page() {
  const [initialMembers, branches, services] = await Promise.all([getTeamMembersFromDatabase(), getBranchesFromDatabase(), getServicesFromDatabase()]);
  return <TeamMembersPageClient initialMembers={initialMembers} branches={branches} services={services} />;
}
