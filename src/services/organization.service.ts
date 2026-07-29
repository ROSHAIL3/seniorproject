import { mockOrganizationProfileOptions } from "@/data/mock/organization";
import type {
  Organization,
  OrganizationDetails,
  OrganizationLogo,
  PublicBookingSettings,
} from "@/types/organization";

type ApiErrorBody = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export class OrganizationValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Please correct the highlighted organization fields.");
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & T;

  if (!response.ok) {
    if (body.fieldErrors) {
      throw new OrganizationValidationError(body.fieldErrors);
    }

    throw new Error(body.error ?? "The organization request failed.");
  }

  return body;
}

export async function getOrganization() {
  const response = await fetch("/api/settings/organization", {
    cache: "no-store",
  });
  const body = await readJson<{ organization: Organization }>(response);
  return body.organization;
}

export async function getOrganizationProfileOptions() {
  return {
    countries: mockOrganizationProfileOptions.countries.map((option) => ({
      ...option,
    })),
    currencies: mockOrganizationProfileOptions.currencies.map((option) => ({
      ...option,
    })),
    timeZones: mockOrganizationProfileOptions.timeZones.map((option) => ({
      ...option,
    })),
  };
}

export function validateOrganizationDetails(input: OrganizationDetails) {
  const errors: Record<string, string> = {};
  const name = String(input?.name ?? "");
  const businessEmail = String(input?.businessEmail ?? "");
  const businessPhone = String(input?.businessPhone ?? "");
  const website = String(input?.website ?? "");
  if (!name.trim()) errors.name = "Organization name is required.";
  if (!/^\S+@\S+\.\S+$/.test(businessEmail.trim())) {
    errors.businessEmail = "Enter a valid business email.";
  }
  if (!/^\+?[0-9][0-9\s()-]{6,}$/.test(businessPhone.trim())) {
    errors.businessPhone = "Enter a valid business phone number.";
  }
  if (!input?.country) errors.country = "Country is required.";
  if (!input?.currency) errors.currency = "Currency is required.";
  if (!input?.timeZone) errors.timeZone = "Time zone is required.";
  if (website && !/^https?:\/\/\S+$/i.test(website)) {
    errors.website = "Website must start with http:// or https://.";
  }
  return errors;
}

export async function updateOrganizationDetails(input: OrganizationDetails) {
  const errors = validateOrganizationDetails(input);
  if (Object.keys(errors).length) {
    throw new OrganizationValidationError(errors);
  }

  const response = await fetch("/api/settings/organization", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ details: input }),
  });
  const body = await readJson<{ organization: Organization }>(response);
  return body.organization.details;
}

export async function setOrganizationLogo(file?: File) {
  const response = await fetch("/api/settings/organization/logo", {
    method: file ? "PUT" : "DELETE",
    body: file ? createLogoFormData(file) : undefined,
  });
  const body = await readJson<{
    logo?: OrganizationLogo;
    storage: Organization["storage"];
  }>(response);
  return body;
}

function createLogoFormData(file: File) {
  const formData = new FormData();
  formData.set("logo", file);
  return formData;
}

export function validateBookingSlug(slug: string) {
  if (slug.length < 3 || slug.length > 50) {
    return "Slug must contain between 3 and 50 characters.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Use lowercase letters, numbers and single hyphens only.";
  }
  return "";
}

export function buildPublicBookingUrl(settings: PublicBookingSettings) {
  return `${settings.baseUrl.replace(/\/$/, "")}/${settings.slug}`;
}

export async function updatePublicBooking(input: PublicBookingSettings) {
  const slug = input.slug.trim().toLowerCase();
  const slugError = validateBookingSlug(slug);
  if (slugError) {
    throw new OrganizationValidationError({ slug: slugError });
  }

  const response = await fetch("/api/settings/organization", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicBooking: { enabled: input.enabled, slug },
    }),
  });
  const body = await readJson<{ organization: Organization }>(response);
  return body.organization.publicBooking;
}

export async function deleteOrganization(confirmationName: string) {
  const response = await fetch("/api/settings/organization", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmationName }),
  });
  return readJson<{ success: true }>(response);
}

export function formatStorageSize(bytes: number) {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
