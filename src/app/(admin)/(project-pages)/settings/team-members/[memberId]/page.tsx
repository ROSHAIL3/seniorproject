import type { Metadata } from "next";
import TeamMemberDetailsClient from "@/components/settings/team-members/TeamMemberDetailsClient";
import { getBranchesFromDatabase } from "@/server/branches.repository";
import { getServicesFromDatabase } from "@/server/catalog.repository";
import { getTeamMemberFromDatabase } from "@/server/team-members.repository";

export const metadata: Metadata = { title: "Edit Team Member" };
export default async function Page({ params }: { params: Promise<{ memberId: string }> }) { const { memberId } = await params; const decodedId = decodeURIComponent(memberId); const [member, branches, services] = await Promise.all([getTeamMemberFromDatabase(decodedId), getBranchesFromDatabase(), getServicesFromDatabase()]); return <TeamMemberDetailsClient memberId={decodedId} initialMember={member} branches={branches} services={services} />; }
