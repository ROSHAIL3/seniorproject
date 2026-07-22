import { mockCustomerFieldDefinitions, mockCustomerFieldValues } from "@/data/mock/customer-fields";
import type { CustomerFieldDefinition, CustomerFieldValueMap, CustomerFieldValueRecord } from "@/types/customer-fields";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

export class CustomerFieldsValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) { super("Please correct the customer field errors."); }
}

let definitions = mockCustomerFieldDefinitions.map(cloneDefinition);
let valueRecords = mockCustomerFieldValues.map((record) => ({ ...record }));
const listeners = new Set<() => void>();

function cloneDefinition(field: CustomerFieldDefinition): CustomerFieldDefinition { return { ...field, options: field.options.map((option) => ({ ...option })) }; }
function emitChange() { listeners.forEach((listener) => listener()); }
export function subscribeToCustomerFields(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }

export async function getCustomerFieldDefinitions() { return definitions.filter((field) => field.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(cloneDefinition); }
export async function getCustomerFieldValueRecords(customerId: string): Promise<CustomerFieldValueRecord[]> { return valueRecords.filter((record) => record.customerId === customerId).map((record) => ({ ...record })); }
export async function getCustomerFieldValues(customerId: string): Promise<CustomerFieldValueMap> { return Object.fromEntries((await getCustomerFieldValueRecords(customerId)).map((record) => [record.fieldId, record.value])); }
export async function customerFieldHasData(fieldId: string) { return valueRecords.some((record) => record.fieldId === fieldId && record.value !== "" && record.value !== false); }

export function validateCustomerFieldDefinitions(fields: CustomerFieldDefinition[]) {
  const errors: Record<string, string> = {};
  const labels = new Map<string, string>();
  fields.forEach((field) => {
    const label = field.label.trim();
    if (!label) errors[`field.${field.id}.label`] = "Field label is required.";
    const normalized = label.toLowerCase();
    if (normalized && labels.has(normalized)) { errors[`field.${field.id}.label`] = "Field labels must be unique."; errors[`field.${labels.get(normalized)}.label`] = "Field labels must be unique."; }
    else if (normalized) labels.set(normalized, field.id);
    if (field.type === "Dropdown") {
      const options = field.options.map((option) => option.label.trim()).filter(Boolean);
      if (!options.length) errors[`field.${field.id}.options`] = "Dropdown fields require at least one option.";
      if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) errors[`field.${field.id}.options`] = "Dropdown option labels must be unique.";
    }
  });
  return errors;
}

export async function saveCustomerFieldDefinitions(fields: CustomerFieldDefinition[]) {
  const errors = validateCustomerFieldDefinitions(fields);
  if (Object.keys(errors).length) throw new CustomerFieldsValidationError(errors);
  const previous = definitions.map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required }));
  const now = new Date().toISOString();
  const retainedIds = new Set(fields.map((field) => field.id));
  definitions = fields.map((field, sortOrder) => ({ ...field, label: field.label.trim(), sortOrder, isActive: true, options: field.type === "Dropdown" ? field.options.map((option, optionOrder) => ({ ...option, label: option.label.trim(), sortOrder: optionOrder })) : [], updatedAt: now })).map(cloneDefinition);
  valueRecords = valueRecords.filter((record) => retainedIds.has(record.fieldId));
  emitChange();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Customer fields changed", category: "Settings", targetType: "customer fields", targetId: "customer-fields-primary", description: "Updated the customer information field configuration.", metadata: { fieldCount: definitions.length }, oldValues: { fields: previous }, newValues: { fields: definitions.map((field) => ({ id: field.id, label: field.label, type: field.type, required: field.required })) }, source: "customer-fields" });
  return definitions.map(cloneDefinition);
}

export function validateCustomerFieldValues(values: CustomerFieldValueMap) {
  const errors: Record<string, string> = {};
  definitions.filter((field) => field.isActive).forEach((field) => {
    const value = values[field.id];
    const empty = value === undefined || value === "" || value === false;
    const key = `customFields.${field.id}`;
    if (field.required && empty) { errors[key] = `${field.label} is required.`; return; }
    if (empty || typeof value === "boolean") return;
    if (field.type === "Number" && !Number.isFinite(Number(value))) errors[key] = `${field.label} must be a number.`;
    if (field.type === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[key] = `Enter a valid email for ${field.label}.`;
    if (field.type === "Phone" && (value.replace(/\D/g, "").length < 8 || value.replace(/\D/g, "").length > 15)) errors[key] = `Enter a valid phone number for ${field.label}.`;
    if (field.type === "Date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[key] = `Choose a valid date for ${field.label}.`;
    if (field.type === "Dropdown" && !field.options.some((option) => option.id === value)) errors[key] = `Choose a valid option for ${field.label}.`;
  });
  return errors;
}

export async function saveCustomerFieldValues(customerId: string, values: CustomerFieldValueMap) {
  const errors = validateCustomerFieldValues(values);
  if (Object.keys(errors).length) throw new CustomerFieldsValidationError(errors);
  const now = new Date().toISOString();
  const activeIds = new Set(definitions.filter((field) => field.isActive).map((field) => field.id));
  valueRecords = valueRecords.filter((record) => record.customerId !== customerId || !activeIds.has(record.fieldId));
  Object.entries(values).forEach(([fieldId, value]) => { if (activeIds.has(fieldId) && value !== "" && value !== false) valueRecords.push({ customerId, fieldId, value, updatedAt: now }); });
  emitChange();
  return getCustomerFieldValueRecords(customerId);
}

export function createCustomerFieldDefinition(sortOrder: number): CustomerFieldDefinition { const now = new Date().toISOString(); return { id: `customer-field-${crypto.randomUUID()}`, label: "", type: "Text", required: false, isActive: true, sortOrder, options: [], createdAt: now, updatedAt: now }; }
export function createCustomerFieldOption(sortOrder: number) { return { id: `customer-field-option-${crypto.randomUUID()}`, label: "", sortOrder }; }
export function formatCustomerFieldValue(field: CustomerFieldDefinition, value: string | boolean | undefined) { if (value === undefined || value === "") return "Not provided"; if (field.type === "Checkbox") return value ? "Yes" : "No"; if (field.type === "Dropdown") return field.options.find((option) => option.id === value)?.label ?? "Not provided"; return String(value); }
