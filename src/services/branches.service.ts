import { mockBranchFormOptions } from "@/data/mock/branches";
import type {
  Branch,
  BranchFieldErrors,
  BranchFormOptions,
  BranchInput,
} from "@/types/branches";

type ApiErrorBody = {
  error?: string;
  fieldErrors?: BranchFieldErrors;
};

export class BranchValidationError extends Error {
  constructor(public fieldErrors: BranchFieldErrors) {
    super("Please correct the highlighted branch fields.");
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;

  if (!response.ok) {
    if (body.fieldErrors) throw new BranchValidationError(body.fieldErrors);
    throw new Error(body.error ?? "The branch request failed.");
  }

  return body;
}

export async function getBranches(): Promise<Branch[]> {
  const response = await fetch("/api/settings/branches", {
    cache: "no-store",
  });
  const body = await readJson<{ branches: Branch[] }>(response);
  return body.branches;
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

export function validateBranch(input: BranchInput) {
  const errors: BranchFieldErrors = {};
  const name = String(input?.name ?? "");
  const phone = String(input?.phone ?? "");
  const email = String(input?.email ?? "");
  const address = String(input?.address ?? "");
  const googleMapsUrl = String(input?.googleMapsUrl ?? "");
  const timeZone = String(input?.timeZone ?? "");
  if (!name.trim()) errors.name = "Branch name is required.";
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number with 8 to 15 digits.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Enter a valid branch email.";
  }
  if (!address.trim()) errors.address = "Address is required.";
  if (
    googleMapsUrl &&
    !/^https?:\/\/\S+$/i.test(googleMapsUrl.trim())
  ) {
    errors.googleMapsUrl = "Enter a valid Google Maps link.";
  }
  if (!timeZone) errors.timeZone = "Time zone is required.";
  if (!["Active", "Inactive", "Archived"].includes(String(input?.status))) {
    errors.status = "Choose a valid branch status.";
  }
  return errors;
}

async function saveBranch(
  method: "POST" | "PATCH",
  input: BranchInput,
  id?: string,
) {
  const errors = validateBranch(input);
  if (Object.keys(errors).length) throw new BranchValidationError(errors);

  const response = await fetch(
    id ? `/api/settings/branches/${encodeURIComponent(id)}` : "/api/settings/branches",
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const body = await readJson<{ branch: Branch }>(response);
  return body.branch;
}

export function createBranch(input: BranchInput) {
  return saveBranch("POST", input);
}

export function updateBranch(id: string, input: BranchInput) {
  return saveBranch("PATCH", input, id);
}

export async function renameBranch(id: string, name: string): Promise<Branch> {
  const branches = await getBranches();
  const branch = branches.find((record) => record.id === id);
  if (!branch) throw new Error("The branch could not be found.");
  return updateBranch(id, { ...branch, name });
}

export async function archiveBranch(id: string): Promise<Branch> {
  const branches = await getBranches();
  const branch = branches.find((record) => record.id === id);
  if (!branch) throw new Error("The branch could not be found.");
  if (branch.isMain) {
    throw new Error(
      "The main branch cannot be archived. Assign another main branch first.",
    );
  }
  return updateBranch(id, { ...branch, status: "Archived" });
}

export async function deleteBranch(id: string) {
  const response = await fetch(
    `/api/settings/branches/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  await readJson<{ success: true }>(response);
}
