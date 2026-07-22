import { quickAddCategories } from "@/data/mock/quick-add-services";
import { mockServiceCategories } from "@/data/mock/service-categories";
import { mockServices } from "@/data/mock/services";
import type { QuickAddCategory, Service, ServiceCategory, ServiceCategoryInput, ServiceFieldErrors, ServiceInput } from "@/types/services";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";
import { getStaffIdsForService, setServiceStaff } from "./service-assignments.service";

export class ServiceValidationError extends Error { constructor(public fieldErrors: ServiceFieldErrors) { super("Please correct the highlighted service fields."); } }
export class ServiceCategoryValidationError extends Error { constructor(public fieldErrors: { name?: string; form?: string }) { super("Please correct the category fields."); } }

const serviceRecords: Service[] = mockServices.map((service) => ({ ...service, staffIds: [] }));
const categoryRecords: ServiceCategory[] = mockServiceCategories.map((category) => ({ ...category }));
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const cloneService = (service: Service): Service => ({ ...service, staffIds: getStaffIdsForService(service.id) });
export function subscribeToServices(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function getServices(): Promise<Service[]> { return serviceRecords.map(cloneService); }
export async function getBookableServices(): Promise<Service[]> { const activeCategories = new Set(categoryRecords.filter((category) => category.status === "Active").map((category) => category.id)); return serviceRecords.filter((service) => service.isActive && activeCategories.has(service.categoryId)).map(cloneService); }
export async function getServiceById(id: string): Promise<Service | null> { const service = serviceRecords.find((item) => item.id === id); return service ? cloneService(service) : null; }
export async function getServiceCategories(includeArchived = false): Promise<ServiceCategory[]> { return categoryRecords.filter((category) => includeArchived || category.status === "Active").map((category) => ({ ...category })); }
export async function getQuickAddCategories(): Promise<QuickAddCategory[]> { return structuredClone(quickAddCategories); }

export function validateService(input: ServiceInput, serviceId?: string): ServiceFieldErrors {
  const errors: ServiceFieldErrors = {}; const name = input.name.trim();
  if (!name) errors.name = "Service name is required.";
  if (!input.categoryId || !categoryRecords.some((category) => category.id === input.categoryId && category.status === "Active")) errors.categoryId = "Select an active category.";
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) errors.durationMinutes = "Duration must be greater than zero.";
  if (!Number.isFinite(input.priceBhd) || input.priceBhd < 0) errors.priceBhd = "Price cannot be negative.";
  if (name && input.categoryId && serviceRecords.some((service) => service.id !== serviceId && service.categoryId === input.categoryId && service.name.toLowerCase() === name.toLowerCase())) errors.name = "A service with this name already exists in the category.";
  return errors;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const errors = validateService(input); if (Object.keys(errors).length) throw new ServiceValidationError(errors);
  const now = new Date().toISOString(); const service: Service = { ...normalizeService(input), id: `service-${crypto.randomUUID()}`, createdAt: now, updatedAt: now, staffIds: [] };
  serviceRecords.push(service); setServiceStaff(service.id, input.staffIds); emit(); const created = cloneService(service);
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: `${service.kind === "package" ? "Package" : "Service"} created`, category: "Catalog & Team", targetType: service.kind, targetId: service.id, description: `Created ${service.name}.`, metadata: { service: service.name, category: categoryRecords.find((item) => item.id === service.categoryId)?.name, staffCount: created.staffIds.length }, newValues: { durationMinutes: service.durationMinutes, priceBhd: service.priceBhd, isActive: service.isActive, vatApplicable: service.vatApplicable }, source: "catalog" });
  return created;
}

export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  const index = serviceRecords.findIndex((service) => service.id === id); if (index < 0) throw new Error("The service could not be found.");
  const errors = validateService(input, id); if (Object.keys(errors).length) throw new ServiceValidationError(errors);
  const previous = cloneService(serviceRecords[index]); serviceRecords[index] = { ...serviceRecords[index], ...normalizeService(input), staffIds: [], updatedAt: new Date().toISOString() }; setServiceStaff(id, input.staffIds); emit(); const updated = cloneService(serviceRecords[index]);
  const action = previous.isActive !== updated.isActive ? `${updated.kind === "package" ? "Package" : "Service"} ${updated.isActive ? "activated" : "deactivated"}` : `${updated.kind === "package" ? "Package" : "Service"} edited`;
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action, category: "Catalog & Team", targetType: updated.kind, targetId: id, description: `${action}: ${updated.name}.`, metadata: { service: updated.name, category: categoryRecords.find((item) => item.id === updated.categoryId)?.name, staffCount: updated.staffIds.length }, oldValues: { name: previous.name, categoryId: previous.categoryId, durationMinutes: previous.durationMinutes, priceBhd: previous.priceBhd, isActive: previous.isActive, vatApplicable: previous.vatApplicable, staffIds: previous.staffIds }, newValues: { name: updated.name, categoryId: updated.categoryId, durationMinutes: updated.durationMinutes, priceBhd: updated.priceBhd, isActive: updated.isActive, vatApplicable: updated.vatApplicable, staffIds: updated.staffIds }, source: "catalog" });
  return updated;
}

export async function archiveService(id: string): Promise<Service> {
  const current = await getServiceById(id); if (!current) throw new Error("The service could not be found.");
  if (!current.isActive) return current;
  return updateService(id, { ...current, isActive: false });
}

export async function createServiceCategory(input: ServiceCategoryInput): Promise<ServiceCategory> {
  validateCategory(input); const now = new Date().toISOString(); const category: ServiceCategory = { id: `category-${crypto.randomUUID()}`, name: input.name.trim(), status: input.status, createdAt: now, updatedAt: now };
  categoryRecords.push(category); emit(); await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Service category created", category: "Catalog & Team", targetType: "service category", targetId: category.id, description: `Created service category ${category.name}.`, metadata: { category: category.name }, newValues: { status: category.status }, source: "catalog" }); return { ...category };
}

export async function updateServiceCategory(id: string, input: ServiceCategoryInput): Promise<ServiceCategory> {
  const index = categoryRecords.findIndex((category) => category.id === id); if (index < 0) throw new Error("The category could not be found."); validateCategory(input, id); const previous = { ...categoryRecords[index] }; categoryRecords[index] = { ...categoryRecords[index], name: input.name.trim(), status: input.status, updatedAt: new Date().toISOString() }; emit(); const updated = categoryRecords[index];
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Service category edited", category: "Catalog & Team", targetType: "service category", targetId: id, description: `Updated service category ${updated.name}.`, metadata: { category: updated.name }, oldValues: { name: previous.name, status: previous.status }, newValues: { name: updated.name, status: updated.status }, source: "catalog" }); return { ...updated };
}

export async function archiveOrDeleteServiceCategory(id: string): Promise<"archived" | "deleted"> {
  const index = categoryRecords.findIndex((category) => category.id === id); if (index < 0) throw new Error("The category could not be found."); const category = categoryRecords[index]; const containsServices = serviceRecords.some((service) => service.categoryId === id);
  if (containsServices) { category.status = "Archived"; category.updatedAt = new Date().toISOString(); serviceRecords.forEach((service) => { if (service.categoryId === id) { service.isActive = false; service.updatedAt = category.updatedAt; } }); emit(); await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Service category archived", category: "Catalog & Team", targetType: "service category", targetId: id, description: `Archived service category ${category.name}.`, metadata: { category: category.name }, newValues: { status: "Archived" }, source: "catalog" }); return "archived"; }
  categoryRecords.splice(index, 1); emit(); await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Service category deleted", category: "Catalog & Team", targetType: "service category", targetId: id, description: `Deleted empty service category ${category.name}.`, metadata: { category: category.name }, source: "catalog" }); return "deleted";
}

export async function quickAddServices(categoryName: string, templateIds: string[]): Promise<Service[]> {
  const definition = quickAddCategories.find((category) => category.name === categoryName); if (!definition) throw new Error("Quick Add category was not found.");
  let category = categoryRecords.find((item) => item.name.toLowerCase() === categoryName.toLowerCase()); if (!category) category = await createServiceCategory({ name: categoryName, status: "Active" }); else if (category.status === "Archived") category = await updateServiceCategory(category.id, { name: category.name, status: "Active" });
  const created: Service[] = [];
  for (const template of definition.templates.filter((item) => templateIds.includes(item.id))) { const exists = serviceRecords.some((service) => service.categoryId === category.id && service.name.toLowerCase() === template.name.toLowerCase()); if (!exists) created.push(await createService({ name: template.name, kind: "service", categoryId: category.id, description: template.description, durationMinutes: template.durationMinutes, priceBhd: template.priceBhd, imageUrl: "", staffIds: [], isActive: true, vatApplicable: true })); }
  return created;
}

function validateCategory(input: ServiceCategoryInput, categoryId?: string) { const name = input.name.trim(); const errors: { name?: string } = {}; if (!name) errors.name = "Category name is required."; else if (categoryRecords.some((category) => category.id !== categoryId && category.name.toLowerCase() === name.toLowerCase())) errors.name = "A category with this name already exists."; if (Object.keys(errors).length) throw new ServiceCategoryValidationError(errors); }
function normalizeService(input: ServiceInput): ServiceInput { return { ...input, name: input.name.trim(), description: input.description.trim(), priceBhd: Math.round(input.priceBhd * 1000) / 1000, durationMinutes: Math.round(input.durationMinutes), staffIds: [...input.staffIds] }; }
