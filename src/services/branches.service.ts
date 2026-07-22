import { mockBranches, mockBranchFormOptions } from "@/data/mock/branches";
import type { Branch, BranchFieldErrors, BranchFormOptions, BranchInput } from "@/types/branches";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

export class BranchValidationError extends Error {
  constructor(public fieldErrors: BranchFieldErrors) {
    super("Please correct the highlighted branch fields.");
  }
}

const branchRecords = mockBranches.map((branch) => ({ ...branch }));
const listeners = new Set<() => void>();

export function subscribeToBranches(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export async function getBranches(): Promise<Branch[]> {
  return branchRecords.map((branch) => ({ ...branch }));
}

export async function getBranchFormOptions(): Promise<BranchFormOptions> {
  return {
    timeZones: mockBranchFormOptions.timeZones.map((option) => ({ ...option })),
    statuses: mockBranchFormOptions.statuses.map((option) => ({ ...option })),
  };
}

export function canBranchReceiveAppointments(branch: Branch) {
  return branch.status === "Active";
}

export function validateBranch(input: BranchInput, branchId?: string) {
  const errors: BranchFieldErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "Branch name is required.";
  else if (branchRecords.some((branch) => branch.id !== branchId && branch.name.toLowerCase() === name.toLowerCase())) errors.name = "A branch with this name already exists.";
  const phoneDigits = input.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) errors.phone = "Enter a valid phone number with 8 to 15 digits.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = "Enter a valid branch email.";
  if (!input.address.trim()) errors.address = "Address is required.";
  if (input.googleMapsUrl && !/^https?:\/\/\S+$/i.test(input.googleMapsUrl.trim())) errors.googleMapsUrl = "Enter a valid Google Maps link.";
  if (!input.timeZone) errors.timeZone = "Time zone is required.";
  const current = branchId ? branchRecords.find((branch) => branch.id === branchId) : undefined;
  if (current?.isMain && !input.isMain && !branchRecords.some((branch) => branch.id !== branchId && branch.isMain)) errors.isMain = "Assign another branch as main before removing main status.";
  return errors;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const errors = validateBranch(input);
  if (Object.keys(errors).length) throw new BranchValidationError(errors);
  const now = new Date().toISOString();
  const branch: Branch = {
    ...normalizeInput(input),
    id: `branch-${crypto.randomUUID()}`,
    code: generateBranchCode(input.name),
    createdAt: now,
    updatedAt: now,
  };
  if (branch.isMain) branchRecords.forEach((record) => { record.isMain = false; record.updatedAt = now; });
  if (branchRecords.length === 0) branch.isMain = true;
  branchRecords.push(branch);
  emitChange();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Branch created", category: "Catalog & Team", targetType: "branch", targetId: branch.id, description: `Created branch ${branch.name}.`, metadata: { branch: branch.name }, newValues: { name: branch.name, status: branch.status, isMain: branch.isMain }, source: "branches" });
  return { ...branch };
}

export async function updateBranch(id: string, input: BranchInput): Promise<Branch> {
  const index = branchRecords.findIndex((branch) => branch.id === id);
  if (index < 0) throw new Error("The branch could not be found.");
  const errors = validateBranch(input, id);
  if (Object.keys(errors).length) throw new BranchValidationError(errors);
  const now = new Date().toISOString();
  if (input.isMain) branchRecords.forEach((branch) => { if (branch.id !== id) { branch.isMain = false; branch.updatedAt = now; } });
  const previous = { ...branchRecords[index] };
  branchRecords[index] = { ...branchRecords[index], ...normalizeInput(input), updatedAt: now };
  emitChange();
  const updated = branchRecords[index];
  const action = previous.status !== "Active" && updated.status === "Active" ? "Branch activated" : previous.name !== updated.name ? "Branch renamed" : "Branch updated";
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action, category: "Catalog & Team", targetType: "branch", targetId: id, description: `${action} ${updated.name}.`, metadata: { branch: updated.name }, oldValues: { name: previous.name, status: previous.status, isMain: previous.isMain }, newValues: { name: updated.name, status: updated.status, isMain: updated.isMain }, source: "branches" });
  return { ...branchRecords[index] };
}

export async function renameBranch(id: string, name: string): Promise<Branch> {
  const branch = branchRecords.find((record) => record.id === id);
  if (!branch) throw new Error("The branch could not be found.");
  return updateBranch(id, { ...branch, name });
}

export async function archiveBranch(id: string): Promise<Branch> {
  const branch = branchRecords.find((record) => record.id === id);
  if (!branch) throw new Error("The branch could not be found.");
  if (branch.isMain) throw new Error("The main branch cannot be archived. Assign another main branch first.");
  const previousStatus = branch.status;
  branch.status = "Archived";
  branch.updatedAt = new Date().toISOString();
  emitChange();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Branch archived", category: "Catalog & Team", targetType: "branch", targetId: id, description: `Archived branch ${branch.name}.`, metadata: { branch: branch.name }, oldValues: { status: previousStatus }, newValues: { status: "Archived" }, source: "branches" });
  return { ...branch };
}

export async function deleteBranch(id: string) {
  const index = branchRecords.findIndex((branch) => branch.id === id);
  if (index < 0) throw new Error("The branch could not be found.");
  if (branchRecords[index].isMain) throw new Error("The main branch cannot be deleted.");
  const deleted = { ...branchRecords[index] };
  branchRecords.splice(index, 1);
  emitChange();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Branch deleted", category: "Catalog & Team", targetType: "branch", targetId: id, description: `Deleted branch ${deleted.name}.`, metadata: { branch: deleted.name }, oldValues: { name: deleted.name, status: deleted.status }, source: "branches" });
}

function normalizeInput(input: BranchInput): BranchInput {
  return {
    ...input,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    address: input.address.trim(),
    googleMapsUrl: input.googleMapsUrl.trim(),
  };
}

function generateBranchCode(name: string) {
  const prefix = name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const nextNumber = branchRecords.reduce((highest, branch) => {
    const match = branch.code.match(/-(\d+)$/);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}
