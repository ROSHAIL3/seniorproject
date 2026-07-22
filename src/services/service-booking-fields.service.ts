import type { AppointmentServiceFieldValueRecord, ServiceBookingFieldDefinition, ServiceBookingFieldValueMap } from "@/types/services";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

export class ServiceBookingFieldsValidationError extends Error { constructor(public fieldErrors: Record<string, string>) { super("Please correct the service booking fields."); } }
const definitions: ServiceBookingFieldDefinition[] = [];
const valueRecords: AppointmentServiceFieldValueRecord[] = [];
const listeners = new Set<() => void>();
const cloneDefinition = (field: ServiceBookingFieldDefinition): ServiceBookingFieldDefinition => ({ ...field, options: field.options.map((option) => ({ ...option })) });
const emit = () => listeners.forEach((listener) => listener());
export function subscribeToServiceBookingFields(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function getServiceBookingFields(serviceId: string, includeInactive = false) { return definitions.filter((field) => field.serviceId === serviceId && (includeInactive || field.isActive)).sort((a, b) => a.sortOrder - b.sortOrder).map(cloneDefinition); }
export function createServiceBookingField(serviceId: string, sortOrder: number): ServiceBookingFieldDefinition { const now = new Date().toISOString(); return { id: `service-field-${crypto.randomUUID()}`, serviceId, label: "", type: "Text", required: false, isActive: true, sortOrder, options: [], createdAt: now, updatedAt: now }; }
export function createServiceBookingFieldOption(sortOrder: number) { return { id: `service-field-option-${crypto.randomUUID()}`, label: "", sortOrder }; }

export async function saveServiceBookingFields(serviceId: string, fields: ServiceBookingFieldDefinition[]) {
  const errors: Record<string, string> = {}; const labels = new Set<string>();
  fields.forEach((field) => { const label = field.label.trim(); if (!label) errors[`field.${field.id}.label`] = "Field label is required."; else if (labels.has(label.toLowerCase())) errors[`field.${field.id}.label`] = "Field labels must be unique."; else labels.add(label.toLowerCase()); if (field.type === "Dropdown") { const options = field.options.map((option) => option.label.trim()).filter(Boolean); if (!options.length) errors[`field.${field.id}.options`] = "Add at least one dropdown option."; if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) errors[`field.${field.id}.options`] = "Dropdown options must be unique."; } });
  if (Object.keys(errors).length) throw new ServiceBookingFieldsValidationError(errors);
  const now = new Date().toISOString(); const retained = new Set(fields.map((field) => field.id));
  definitions.filter((field) => field.serviceId === serviceId && !retained.has(field.id)).forEach((field) => { field.isActive = false; field.updatedAt = now; });
  fields.forEach((field, sortOrder) => { const normalized = { ...field, serviceId, label: field.label.trim(), isActive: true, sortOrder, options: field.type === "Dropdown" ? field.options.map((option, index) => ({ ...option, label: option.label.trim(), sortOrder: index })) : [], updatedAt: now }; const index = definitions.findIndex((item) => item.id === field.id); if (index >= 0) definitions[index] = normalized; else definitions.push(normalized); });
  emit(); await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Service booking fields changed", category: "Catalog & Team", targetType: "service", targetId: serviceId, description: "Updated service-specific booking fields.", metadata: { fieldCount: fields.length }, newValues: { fields: fields.map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required })) }, source: "catalog" }); return getServiceBookingFields(serviceId);
}

export async function validateAppointmentServiceFieldValues(serviceId: string, values: ServiceBookingFieldValueMap) {
  const errors: Record<string, string> = {}; const fields = await getServiceBookingFields(serviceId);
  fields.forEach((field) => { const value = values[field.id]; const empty = value === undefined || value === "" || value === false; const key = `serviceFields.${field.id}`; if (field.required && empty) { errors[key] = `${field.label} is required.`; return; } if (empty || typeof value === "boolean") return; if (field.type === "Number" && !Number.isFinite(Number(value))) errors[key] = `${field.label} must be a number.`; if (field.type === "Date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[key] = `Choose a valid date for ${field.label}.`; if (field.type === "Dropdown" && !field.options.some((option) => option.id === value)) errors[key] = `Choose a valid option for ${field.label}.`; }); return errors;
}

export async function saveAppointmentServiceFieldValues(appointmentId: string, serviceId: string, values: ServiceBookingFieldValueMap) {
  const errors = await validateAppointmentServiceFieldValues(serviceId, values); if (Object.keys(errors).length) throw new ServiceBookingFieldsValidationError(errors); const now = new Date().toISOString(); const fields = await getServiceBookingFields(serviceId); const activeIds = new Set(fields.map((field) => field.id));
  for (let index = valueRecords.length - 1; index >= 0; index--) if (valueRecords[index].appointmentId === appointmentId && activeIds.has(valueRecords[index].fieldId)) valueRecords.splice(index, 1);
  Object.entries(values).forEach(([fieldId, value]) => { if (activeIds.has(fieldId) && value !== "" && value !== false) valueRecords.push({ appointmentId, fieldId, value, updatedAt: now }); }); return getAppointmentServiceFieldValues(appointmentId);
}
export async function getAppointmentServiceFieldValues(appointmentId: string): Promise<ServiceBookingFieldValueMap> { return Object.fromEntries(valueRecords.filter((record) => record.appointmentId === appointmentId).map((record) => [record.fieldId, record.value])); }
export async function getAppointmentServiceFieldDetails(appointmentId: string, serviceId: string) { const values = await getAppointmentServiceFieldValues(appointmentId); const fields = (await getServiceBookingFields(serviceId, true)).filter((field) => values[field.id] !== undefined); return fields.map((field) => ({ field, value: values[field.id] })); }
