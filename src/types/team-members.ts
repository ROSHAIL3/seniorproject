export const teamMemberRoles = ["Owner", "Admin", "Manager", "Staff", "Receptionist"] as const;
export type TeamMemberRole = (typeof teamMemberRoles)[number];
export type TeamMemberStatus = "Active" | "Inactive" | "Invited";

export const permissionModules = [
  "Dashboard", "Appointments", "Calendar", "Customers", "Invoices", "Expenses",
  "Reports", "Services", "Packages", "Team Members", "Settings",
] as const;
export const permissionActions = ["view", "create", "edit", "delete"] as const;
export type PermissionModule = (typeof permissionModules)[number];
export type PermissionAction = (typeof permissionActions)[number];
export type PermissionSet = Record<PermissionModule, Record<PermissionAction, boolean>>;

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  branchId: string;
  serviceIds: string[];
  photoUrl: string;
  permissions: PermissionSet;
  workingDays: number[];
  breaks: { startTime: string; endTime: string }[];
  createdAt: string;
  lastActiveAt: string | null;
  invitationSentAt: string | null;
};

export type TeamMemberInput = Pick<TeamMember, "fullName" | "email" | "phone" | "role" | "status" | "branchId" | "serviceIds"> & { permissions?: PermissionSet };
export type TeamMemberFieldErrors = Partial<Record<keyof TeamMemberInput | "form", string>>;
