import "server-only";

import { getTeamMembersFromDatabase } from "./team-members.repository";
import type { StaffMember } from "@/types/staff";

export async function getStaffMembersFromDatabase(): Promise<StaffMember[]> {
  return (await getTeamMembersFromDatabase())
    .filter((member) => member.status === "Active")
    .map((member) => ({
      branchId: member.branchId,
      breaks: member.breaks.map((item) => ({ ...item })),
      createdAt: member.createdAt,
      id: member.id,
      isActive: true,
      name: member.fullName,
      serviceIds: [...member.serviceIds],
      workingDays: [...member.workingDays],
    }));
}
