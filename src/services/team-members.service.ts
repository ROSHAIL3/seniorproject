import { mockStaffMembers } from "@/data/mock/staff";
import { createDefaultPermissions } from "@/lib/team-member-permissions";
import type { TeamMember, TeamMemberFieldErrors, TeamMemberInput } from "@/types/team-members";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";
import { getServiceIdsForStaff, setStaffServices } from "./service-assignments.service";

export class TeamMemberValidationError extends Error {
  constructor(public fieldErrors: TeamMemberFieldErrors) { super("Please correct the highlighted team member fields."); }
}

const seededDetails = [
  { email: "owner@seniorproject.test", phone: "+973 3900 0001", role: "Owner" as const },
  { email: "james@seniorproject.test", phone: "+973 3900 0002", role: "Manager" as const },
  { email: "mia@seniorproject.test", phone: "+973 3900 0003", role: "Staff" as const },
  { email: "daniel@seniorproject.test", phone: "+973 3900 0004", role: "Receptionist" as const },
];

const records: TeamMember[] = mockStaffMembers.map((staff, index) => ({
  id: staff.id, fullName: staff.name, email: seededDetails[index].email, phone: seededDetails[index].phone,
  role: seededDetails[index].role, status: "Active", branchId: staff.branchId, serviceIds: [...staff.serviceIds],
  photoUrl: "", permissions: createDefaultPermissions(index < 2), workingDays: [...staff.workingDays],
  breaks: staff.breaks.map((item) => ({ ...item })), createdAt: staff.createdAt,
  lastActiveAt: index === 0 ? "2026-07-18T16:20:00.000Z" : "2026-07-17T10:00:00.000Z", invitationSentAt: null,
}));
const listeners = new Set<() => void>();
const clone = (member: TeamMember): TeamMember => ({ ...member, serviceIds: getServiceIdsForStaff(member.id), workingDays: [...member.workingDays], breaks: member.breaks.map((item) => ({ ...item })), permissions: structuredClone(member.permissions) });
const emit = () => listeners.forEach((listener) => listener());

export function subscribeToTeamMembers(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function getTeamMembers() { return records.map(clone); }
export async function getTeamMemberById(id: string) { const member = records.find((item) => item.id === id); return member ? clone(member) : null; }
export function canReceiveNewAppointments(member: TeamMember) { return member.status === "Active"; }

export function validateTeamMember(input: TeamMemberInput, memberId?: string): TeamMemberFieldErrors {
  const errors: TeamMemberFieldErrors = {};
  if (!input.fullName.trim()) errors.fullName = "Full name is required.";
  const email = input.email.trim().toLowerCase();
  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  else if (records.some((member) => member.id !== memberId && member.email.toLowerCase() === email)) errors.email = "A team member with this email already exists.";
  const digits = input.phone.replace(/\D/g, "");
  if (input.phone.trim() && (digits.length < 8 || digits.length > 15)) errors.phone = "Enter a valid phone number with 8 to 15 digits.";
  if (!input.branchId) errors.branchId = "Select a branch.";
  return errors;
}

export async function inviteTeamMember(input: TeamMemberInput) {
  const errors = validateTeamMember(input); if (Object.keys(errors).length) throw new TeamMemberValidationError(errors);
  const now = new Date().toISOString();
  const member: TeamMember = { ...normalize(input), id: `team-${crypto.randomUUID()}`, photoUrl: "", status: input.role === "Owner" ? "Active" : input.status, permissions: input.role === "Owner" ? createDefaultPermissions(true) : input.permissions ?? createDefaultPermissions(), workingDays: [1,2,3,4,5,6], breaks: [], createdAt: now, lastActiveAt: null, invitationSentAt: now };
  records.push({ ...member, serviceIds: [] }); setStaffServices(member.id, input.serviceIds); emit();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Team member invited", category: "Catalog & Team", targetType: "team member", targetId: member.id, description: `Invited ${member.fullName} as ${member.role}.`, metadata: { email: member.email, staff: member.fullName, branch: member.branchId }, newValues: { role: member.role, status: member.status, serviceIds: member.serviceIds }, source: "team-members" });
  return clone(member);
}

export async function updateTeamMember(id: string, input: TeamMemberInput) {
  const index = records.findIndex((item) => item.id === id); if (index < 0) throw new Error("The team member could not be found.");
  const current = records[index]; const previous = clone(current); const errors = validateTeamMember(input, id); if (Object.keys(errors).length) throw new TeamMemberValidationError(errors);
  if (current.role === "Owner" && input.role !== "Owner" && records.filter((item) => item.role === "Owner").length === 1) throw new TeamMemberValidationError({ role: "There must always be at least one Owner." });
  if (input.role === "Owner" && input.status !== "Active") throw new TeamMemberValidationError({ status: "The Owner cannot be deactivated." });
  records[index] = { ...current, ...normalize(input), serviceIds: [], permissions: input.role === "Owner" ? createDefaultPermissions(true) : input.permissions ?? current.permissions }; setStaffServices(id, input.serviceIds);
  const updated = clone(records[index]);
  emit();
  const action = current.status !== "Active" && updated.status === "Active" ? "Team member activated" : current.status === "Active" && updated.status === "Inactive" ? "Team member deactivated" : "Team member updated";
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action, category: "Catalog & Team", targetType: "team member", targetId: id, description: `${action}: ${updated.fullName}.`, metadata: { email: updated.email, staff: updated.fullName, branch: updated.branchId }, oldValues: { fullName: previous.fullName, role: previous.role, status: previous.status, branchId: previous.branchId, serviceIds: previous.serviceIds }, newValues: { fullName: updated.fullName, role: updated.role, status: updated.status, branchId: updated.branchId, serviceIds: updated.serviceIds }, source: "team-members" });
  return clone(updated);
}

export async function updateTeamMemberPhoto(id: string, photoUrl: string) {
  const member = records.find((item) => item.id === id); if (!member) throw new Error("The team member could not be found.");
  member.photoUrl = photoUrl; emit();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Team member updated", category: "Catalog & Team", targetType: "team member", targetId: id, description: `Updated the profile photo for ${member.fullName}.`, metadata: { email: member.email, staff: member.fullName }, source: "team-members" });
  return clone(member);
}

function normalize(input: TeamMemberInput): TeamMemberInput {
  return { ...input, fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim(), serviceIds: [...input.serviceIds] };
}
