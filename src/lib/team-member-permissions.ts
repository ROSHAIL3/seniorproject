import { permissionActions, permissionModules, type PermissionSet, type TeamMember } from "@/types/team-members";

export function createDefaultPermissions(enabled = false): PermissionSet {
  return Object.fromEntries(permissionModules.map((module) => [module, Object.fromEntries(permissionActions.map((action) => [action, enabled]))])) as PermissionSet;
}

export function permissionsFor(member: Pick<TeamMember, "role" | "permissions">): PermissionSet {
  return member.role === "Owner" ? createDefaultPermissions(true) : member.permissions;
}

export function can(member: Pick<TeamMember, "role" | "permissions" | "status">, module: keyof PermissionSet, action: keyof PermissionSet[keyof PermissionSet]) {
  return member.status === "Active" && permissionsFor(member)[module][action];
}
