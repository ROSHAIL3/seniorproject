import { quickAddCategories } from "@/data/mock/quick-add-services";
import type {
  QuickAddCategory,
  Service,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceFieldErrors,
  ServiceInput,
} from "@/types/services";

export class ServiceValidationError extends Error {
  constructor(public fieldErrors: ServiceFieldErrors) {
    super("Please correct the highlighted service fields.");
  }
}
export class ServiceCategoryValidationError extends Error {
  constructor(public fieldErrors: { name?: string; form?: string }) {
    super("Please correct the category fields.");
  }
}

type CatalogResponse = {
  categories: ServiceCategory[];
  services: Service[];
};

export function subscribeToServices(onChange?: () => void) {
  void onChange;
  return () => undefined;
}

async function getCatalog(): Promise<CatalogResponse> {
  const response = await fetch("/api/settings/catalog", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "The service catalog could not be loaded.");
  return body;
}

export async function getServices() {
  return (await getCatalog()).services;
}
export async function getBookableServices() {
  const { categories, services } = await getCatalog();
  const active = new Set(categories.filter((item) => item.status === "Active").map((item) => item.id));
  return services.filter((service) => service.isActive && active.has(service.categoryId));
}
export async function getServiceById(id: string) {
  return (await getServices()).find((service) => service.id === id) ?? null;
}
export async function getServiceCategories(includeArchived = false) {
  const records = (await getCatalog()).categories;
  return records.filter((category) => includeArchived || category.status === "Active");
}
export async function getQuickAddCategories(): Promise<QuickAddCategory[]> {
  return structuredClone(quickAddCategories);
}

export function validateService(input: ServiceInput): ServiceFieldErrors {
  const errors: ServiceFieldErrors = {};
  if (!input?.name?.trim()) errors.name = "Service name is required.";
  if (!input?.categoryId) errors.categoryId = "Select an active category.";
  if (!Number.isFinite(input?.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 1440) {
    errors.durationMinutes = "Duration must be between 1 and 1440 minutes.";
  }
  if (!Number.isFinite(input?.priceBhd) || input.priceBhd < 0) errors.priceBhd = "Price cannot be negative.";
  if (!Array.isArray(input?.staffIds) || input.staffIds.length > 200) errors.form = "Too many staff assignments.";
  return errors;
}

export async function createService(input: ServiceInput) {
  return saveService(null, input);
}
export async function updateService(id: string, input: ServiceInput) {
  return saveService(id, input);
}
async function saveService(id: string | null, input: ServiceInput) {
  const normalized = normalizeService(input);
  const errors = validateService(normalized);
  if (Object.keys(errors).length) throw new ServiceValidationError(errors);
  const response = await fetch("/api/settings/catalog/services", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, input: normalized }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "The service could not be saved.");
  return body.service as Service;
}
export async function archiveService(id: string) {
  const current = await getServiceById(id);
  if (!current) throw new Error("The service could not be found.");
  return current.isActive ? updateService(id, { ...current, isActive: false }) : current;
}

export async function createServiceCategory(input: ServiceCategoryInput) {
  return saveCategory(null, input);
}
export async function updateServiceCategory(id: string, input: ServiceCategoryInput) {
  return saveCategory(id, input);
}
async function saveCategory(id: string | null, input: ServiceCategoryInput) {
  if (!input?.name?.trim()) {
    throw new ServiceCategoryValidationError({ name: "Category name is required." });
  }
  const response = await fetch("/api/settings/catalog/categories", {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, input }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.fieldErrors) throw new ServiceCategoryValidationError(body.fieldErrors);
    throw new Error(body.error ?? "The category could not be saved.");
  }
  return body.category as ServiceCategory;
}
export async function archiveOrDeleteServiceCategory(id: string) {
  const response = await fetch("/api/settings/catalog/categories", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "The category could not be archived.");
  return body.result as "archived" | "deleted";
}

export async function quickAddServices(categoryName: string, templateIds: string[]) {
  const definition = quickAddCategories.find((item) => item.name === categoryName);
  if (!definition) throw new Error("Quick Add category was not found.");
  const categories = await getServiceCategories(true);
  let category = categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase());
  if (!category) category = await createServiceCategory({ name: categoryName, status: "Active" });
  else if (category.status === "Archived") category = await updateServiceCategory(category.id, { name: category.name, status: "Active" });
  const existing = await getServices();
  const created: Service[] = [];
  for (const template of definition.templates.filter((item) => templateIds.includes(item.id))) {
    if (existing.some((service) => service.categoryId === category.id && service.name.toLowerCase() === template.name.toLowerCase())) continue;
    created.push(await createService({
      branchIds: [],
      categoryId: category.id,
      description: template.description,
      durationMinutes: template.durationMinutes,
      imageUrl: "",
      isActive: true,
      kind: "service",
      name: template.name,
      priceBhd: template.priceBhd,
      staffIds: [],
      vatApplicable: true,
    }));
  }
  return created;
}

function normalizeService(input: ServiceInput): ServiceInput {
  return {
    ...input,
    branchIds: [...new Set(input.branchIds ?? [])],
    description: input.description.trim(),
    durationMinutes: Math.round(input.durationMinutes),
    imageUrl: input.imageUrl.startsWith("data:") ? "" : input.imageUrl,
    name: input.name.trim(),
    priceBhd: Math.round(input.priceBhd * 1000) / 1000,
    staffIds: [...new Set(input.staffIds ?? [])],
  };
}
