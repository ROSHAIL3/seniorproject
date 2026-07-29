import type {
  TeamMember,
  TeamMemberCreateInput,
  TeamMemberFieldErrors,
  TeamMemberInput,
  TeamMemberInvitationResult,
} from "@/types/team-members";
import { teamMemberRoles } from "@/types/team-members";

type ApiErrorBody = {
  error?: string;
  fieldErrors?: TeamMemberFieldErrors;
};

export class TeamMemberValidationError extends Error {
  constructor(public fieldErrors: TeamMemberFieldErrors) {
    super("Please correct the highlighted team member fields.");
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
  if (!response.ok) {
    if (body.fieldErrors) throw new TeamMemberValidationError(body.fieldErrors);
    throw new Error(body.error ?? "The team member request failed.");
  }
  return body;
}

export function subscribeToTeamMembers(onChange?: () => void) {
  void onChange;
  return () => undefined;
}

export async function getTeamMembers() {
  const response = await fetch("/api/settings/team-members", {
    cache: "no-store",
  });
  const body = await readJson<{ members: TeamMember[] }>(response);
  return body.members;
}

export async function getTeamMemberById(id: string) {
  const response = await fetch(
    `/api/settings/team-members/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  const body = await readJson<{ member: TeamMember }>(response);
  return body.member;
}

export function canReceiveNewAppointments(member: TeamMember) {
  return member.status === "Active";
}

export function validateTeamMember(input: TeamMemberInput) {
  const errors: TeamMemberFieldErrors = {};
  const fullName = String(input?.fullName ?? "").trim();
  const email = String(input?.email ?? "").trim().toLowerCase();
  const phone = String(input?.phone ?? "");
  if (!fullName) errors.fullName = "Full name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  const digits = phone.replace(/\D/g, "");
  if (phone.trim() && (digits.length < 8 || digits.length > 15)) {
    errors.phone = "Enter a valid phone number with 8 to 15 digits.";
  }
  if (!input?.branchId) errors.branchId = "Select a branch.";
  if (!teamMemberRoles.includes(input?.role)) errors.role = "Select a valid role.";
  if (!Array.isArray(input?.serviceIds) || input.serviceIds.length > 200) {
    errors.form = "Select no more than 200 services.";
  }
  return errors;
}

export async function createTeamMember(
  input: TeamMemberCreateInput,
): Promise<TeamMemberInvitationResult> {
  const errors = validateTeamMember(input);
  if (Object.keys(errors).length) throw new TeamMemberValidationError(errors);
  const response = await fetch("/api/settings/team-members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<TeamMemberInvitationResult>(response);
}

export async function updateTeamMember(id: string, input: TeamMemberInput) {
  const errors = validateTeamMember(input);
  if (Object.keys(errors).length) throw new TeamMemberValidationError(errors);
  const response = await fetch(
    `/api/settings/team-members/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const body = await readJson<{ member: TeamMember }>(response);
  return body.member;
}

export async function updateTeamMemberPhoto() {
  throw new Error(
    "Team-member photo storage is deferred to the service-catalog Storage phase to protect the Free Plan quota.",
  );
}

export async function resetTeamMemberPassword(id: string) {
  const response = await fetch(
    `/api/settings/team-members/${encodeURIComponent(id)}/recovery-link`,
    { method: "POST" },
  );
  const body = await readJson<{ recoveryLink: string }>(response);
  return body.recoveryLink;
}

export async function removeTeamMember(id: string) {
  const response = await fetch(
    `/api/settings/team-members/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  await readJson<{ success: true }>(response);
}
