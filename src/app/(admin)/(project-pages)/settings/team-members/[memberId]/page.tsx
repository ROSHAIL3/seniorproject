import type { Metadata } from "next";
import TeamMemberDetailsClient from "@/components/settings/team-members/TeamMemberDetailsClient";
import { getBranches } from "@/services/branches.service";
import { getServices } from "@/services/services.service";
import { getTeamMemberById } from "@/services/team-members.service";

export const metadata: Metadata = { title: "Team Member Details | Senior Project" };
export default async function Page({ params }: { params: Promise<{ memberId: string }> }) { const { memberId } = await params; const decodedId = decodeURIComponent(memberId); const [member, branches, services] = await Promise.all([getTeamMemberById(decodedId), getBranches(), getServices()]); return <TeamMemberDetailsClient memberId={decodedId} initialMember={member} branches={branches} services={services} />; }
