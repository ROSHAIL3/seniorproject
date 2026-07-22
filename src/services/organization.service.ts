import { mockOrganization, mockOrganizationProfileOptions } from "@/data/mock/organization";
import type { Organization, OrganizationDetails, OrganizationLogo, PublicBookingSettings } from "@/types/organization";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

export class OrganizationValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Please correct the highlighted organization fields.");
  }
}

const organization = cloneOrganization(mockOrganization);

function cloneOrganization(value: Organization): Organization {
  return {
    ...value,
    details: { ...value.details, logo: value.details.logo ? { ...value.details.logo } : undefined },
    publicBooking: { ...value.publicBooking },
    storage: { ...value.storage },
  };
}

function updateTimestamp() {
  organization.updatedAt = new Date().toISOString();
}

export async function getOrganization() {
  return cloneOrganization(organization);
}

export async function getOrganizationProfileOptions() {
  return {
    countries: mockOrganizationProfileOptions.countries.map((option) => ({ ...option })),
    currencies: mockOrganizationProfileOptions.currencies.map((option) => ({ ...option })),
    timeZones: mockOrganizationProfileOptions.timeZones.map((option) => ({ ...option })),
  };
}

export function validateOrganizationDetails(input: OrganizationDetails) {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Organization name is required.";
  if (!/^\S+@\S+\.\S+$/.test(input.businessEmail.trim())) errors.businessEmail = "Enter a valid business email.";
  if (!/^\+?[0-9][0-9\s()-]{6,}$/.test(input.businessPhone.trim())) errors.businessPhone = "Enter a valid business phone number.";
  if (!input.country) errors.country = "Country is required.";
  if (!input.currency) errors.currency = "Currency is required.";
  if (!input.timeZone) errors.timeZone = "Time zone is required.";
  if (input.website && !/^https?:\/\/\S+$/i.test(input.website)) errors.website = "Website must start with http:// or https://.";
  return errors;
}

export async function updateOrganizationDetails(input: OrganizationDetails) {
  const errors = validateOrganizationDetails(input);
  if (Object.keys(errors).length) throw new OrganizationValidationError(errors);
  const previous = { ...organization.details, logo: organization.details.logo ? { ...organization.details.logo } : undefined };
  const emailChanged = input.businessEmail.trim().toLowerCase() !== organization.details.businessEmail.toLowerCase();
  organization.details = {
    ...input,
    name: input.name.trim(),
    businessEmail: input.businessEmail.trim(),
    businessPhone: input.businessPhone.trim(),
    address: input.address.trim(),
    website: input.website.trim(),
    emailVerified: emailChanged ? false : input.emailVerified,
    logo: input.logo ? { ...input.logo } : undefined,
  };
  updateTimestamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Organization profile updated", category: "Settings", targetType: "organization", targetId: organization.id, description: "Updated the organization profile.", metadata: { organization: organization.details.name }, oldValues: { name: previous.name, businessEmail: previous.businessEmail, businessPhone: previous.businessPhone, address: previous.address }, newValues: { name: organization.details.name, businessEmail: organization.details.businessEmail, businessPhone: organization.details.businessPhone, address: organization.details.address }, source: "organization-profile" });
  return { ...organization.details, logo: organization.details.logo ? { ...organization.details.logo } : undefined };
}

export async function setOrganizationLogo(logo?: OrganizationLogo) {
  const hadLogo = Boolean(organization.details.logo);
  organization.details.logo = logo ? { ...logo } : undefined;
  updateTimestamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Organization profile updated", category: "Settings", targetType: "organization", targetId: organization.id, description: logo ? "Updated the organization logo." : "Removed the organization logo.", metadata: { organization: organization.details.name }, oldValues: { hasLogo: hadLogo }, newValues: { hasLogo: Boolean(logo) }, source: "organization-profile" });
  return organization.details.logo ? { ...organization.details.logo } : undefined;
}

export async function verifyOrganizationEmail() {
  if (!/^\S+@\S+\.\S+$/.test(organization.details.businessEmail)) throw new Error("Save a valid business email before verifying it.");
  organization.details.emailVerified = true;
  updateTimestamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Organization email verified", category: "Account", targetType: "organization", targetId: organization.id, description: "Verified the organization email address.", metadata: { email: organization.details.businessEmail }, source: "organization-profile" });
  return true;
}

export function validateBookingSlug(slug: string) {
  if (slug.length < 3 || slug.length > 50) return "Slug must contain between 3 and 50 characters.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters, numbers and single hyphens only.";
  return "";
}

export function buildPublicBookingUrl(settings: PublicBookingSettings) {
  return `${settings.baseUrl.replace(/\/$/, "")}/${settings.slug}`;
}

export async function updatePublicBooking(input: PublicBookingSettings) {
  const slug = input.slug.trim().toLowerCase();
  const slugError = validateBookingSlug(slug);
  if (slugError) throw new OrganizationValidationError({ slug: slugError });
  const previous = { ...organization.publicBooking };
  organization.publicBooking = { ...input, slug };
  updateTimestamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Public booking settings changed", category: "Settings", targetType: "public booking settings", targetId: organization.id, description: "Updated public booking settings.", metadata: { organization: organization.details.name }, oldValues: previous, newValues: organization.publicBooking, source: "organization-profile" });
  return { ...organization.publicBooking };
}

export async function deleteOrganization(confirmationName: string) {
  if (confirmationName !== organization.details.name) throw new OrganizationValidationError({ confirmationName: "Enter the organization name exactly as shown." });
  organization.status = "Deleted";
  updateTimestamp();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Organization deleted", category: "System", targetType: "organization", targetId: organization.id, description: `Deleted organization ${organization.details.name}.`, metadata: { organization: organization.details.name }, oldValues: { status: "Active" }, newValues: { status: "Deleted" }, source: "organization-profile" });
  return cloneOrganization(organization);
}

export function formatStorageSize(bytes: number) {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(bytes >= 104_857_600 ? 0 : 1)} MB`;
}
