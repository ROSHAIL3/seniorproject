import type { StaffMember } from "@/types/staff";
import { getTeamMemberById, getTeamMembers } from "./team-members.service";

export async function getStaffMembers(): Promise<StaffMember[]> {
  return (await getTeamMembers()).filter((member) => member.status === "Active").map(toStaffMember);
}

export async function getStaffMemberById(
  id: string,
): Promise<StaffMember | null> {
  const member = await getTeamMemberById(id);
  return member ? toStaffMember(member) : null;
}

function toStaffMember(member: Awaited<ReturnType<typeof getTeamMembers>>[number]): StaffMember {
  return { id: member.id, name: member.fullName, branchId: member.branchId, serviceIds: [...member.serviceIds], workingDays: [...member.workingDays], breaks: member.breaks.map((item) => ({ ...item })), isActive: member.status === "Active", createdAt: member.createdAt };
}
