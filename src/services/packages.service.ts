import type {
  PackageFieldErrors,
  PackageInput,
  PackageUsage,
  ServicePackage,
} from "@/types/packages";
import type { Service } from "@/types/services";
import { getServices } from "./services.service";

export class PackageValidationError extends Error {
  constructor(public fieldErrors: PackageFieldErrors) {
    super("Please correct the highlighted package fields.");
  }
}
const usageRecords: PackageUsage[] = [];

export function subscribeToPackages(onChange?: () => void) {
  void onChange;
  return () => undefined;
}
async function getCatalog() {
  const response = await fetch("/api/settings/catalog", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Packages could not be loaded.");
  return body as { packages: ServicePackage[] };
}
export async function getPackages() {
  return (await getCatalog()).packages;
}
export async function getBookablePackages() {
  return (await getPackages()).filter((item) => item.isActive);
}
export async function getPackageById(id: string) {
  return (await getPackages()).find((item) => item.id === id) ?? null;
}
export async function calculatePackageOriginalTotal(input: Pick<PackageInput, "items">) {
  const services = await getServices();
  return input.items.reduce(
    (total, item) => total + (services.find((service) => service.id === item.serviceId)?.priceBhd ?? 0) * item.quantity,
    0,
  );
}
export async function validatePackage(input: PackageInput): Promise<PackageFieldErrors> {
  const errors: PackageFieldErrors = {};
  if (!input?.name?.trim()) errors.name = "Package name is required.";
  if (!Number.isFinite(input?.sellingPriceBhd) || input.sellingPriceBhd < 0) errors.sellingPriceBhd = "Selling price cannot be negative.";
  const valid = input?.items?.filter((item) => item.serviceId && item.quantity > 0) ?? [];
  if (!valid.length) errors.items = "Add at least one service.";
  if (valid.length > 100) errors.items = "A package can contain at most 100 services.";
  if (new Set(valid.map((item) => item.serviceId)).size !== valid.length) errors.items = "Duplicate services must be combined into one row.";
  const original = await calculatePackageOriginalTotal(input);
  if (!input.allowPriceAboveOriginal && input.sellingPriceBhd > original) errors.sellingPriceBhd = "Selling price cannot exceed the original total unless explicitly allowed.";
  return errors;
}
export async function createPackage(input: PackageInput) {
  return savePackage(null, input);
}
export async function updatePackage(id: string, input: PackageInput) {
  return savePackage(id, input);
}
async function savePackage(id: string | null, input: PackageInput) {
  const normalized = normalize(input);
  const errors = await validatePackage(normalized);
  if (Object.keys(errors).length) throw new PackageValidationError(errors);
  const response = await fetch("/api/settings/catalog/packages", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, input: normalized }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "The package could not be saved.");
  return body.package as ServicePackage;
}
export async function archivePackage(id: string) {
  const item = await getPackageById(id);
  if (!item) throw new Error("The package could not be found.");
  return item.isActive ? updatePackage(id, { ...item, isActive: false }) : item;
}
export async function packageToBookingService(item: ServicePackage, providedServices?: Service[]): Promise<Service> {
  const services = providedServices ?? await getServices();
  const included = item.items.map((row) => services.find((service) => service.id === row.serviceId)).filter((service): service is Service => Boolean(service));
  return {
    branchIds: [...new Set(included.flatMap((service) => service.branchIds))],
    categoryId: "packages",
    createdAt: item.createdAt,
    description: item.description,
    durationMinutes: item.type === "Combo"
      ? item.items.reduce((total, row) => total + (services.find((service) => service.id === row.serviceId)?.durationMinutes ?? 0) * row.quantity, 0)
      : Math.max(...included.map((service) => service.durationMinutes), 0),
    id: item.id,
    imageUrl: item.imageUrl,
    isActive: item.isActive,
    kind: "package",
    name: item.name,
    priceBhd: item.sellingPriceBhd,
    staffIds: [...new Set(included.flatMap((service) => service.staffIds))],
    updatedAt: item.updatedAt,
    vatApplicable: true,
  };
}
export async function getPackageBookingOfferings() {
  return Promise.all((await getBookablePackages()).map((item) => packageToBookingService(item)));
}
export async function recordPackageUsage(packageId: string, customerId: string, appointmentId: string) {
  const item = await getPackageById(packageId);
  if (!item) return;
  usageRecords.push({
    appointmentId,
    createdAt: new Date().toISOString(),
    customerId,
    id: `package-usage-${crypto.randomUUID()}`,
    packageId,
    usedQuantities: Object.fromEntries(item.items.map((row) => [row.serviceId, item.type === "Combo" ? row.quantity : 0])),
  });
}
export async function getCustomerPackageUsage(customerId: string) {
  return usageRecords.filter((item) => item.customerId === customerId).map((item) => ({ ...item, usedQuantities: { ...item.usedQuantities } }));
}
export async function getAppointmentPackageUsage(appointmentId: string) {
  const item = usageRecords.find((record) => record.appointmentId === appointmentId);
  return item ? { ...item, usedQuantities: { ...item.usedQuantities } } : null;
}
function normalize(input: PackageInput): PackageInput {
  return {
    ...input,
    description: input.description.trim(),
    imageUrl: input.imageUrl.startsWith("data:") ? "" : input.imageUrl,
    items: input.items.map((row, index) => ({ ...row, quantity: Math.max(1, Math.round(row.quantity)), sortOrder: index })),
    name: input.name.trim(),
    sellingPriceBhd: Math.round(input.sellingPriceBhd * 1000) / 1000,
  };
}
