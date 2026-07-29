import type {
  CustomerFieldDefinition,
  CustomerFieldValueMap,
  CustomerFieldValueRecord,
} from "@/types/customer-fields";

export class CustomerFieldsValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Please correct the customer field errors.");
  }
}

let cachedDefinitions: CustomerFieldDefinition[] = [];

export function subscribeToCustomerFields(_listener?: () => void) {
  void _listener;
  return () => undefined;
}

export async function getCustomerFieldDefinitions() {
  const response = await fetch("/api/settings/customer-fields", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Customer fields could not be loaded.");
  cachedDefinitions = (body.fields as CustomerFieldDefinition[]).map(cloneDefinition);
  return cachedDefinitions.map(cloneDefinition);
}

export async function getCustomerFieldValueRecords(
  customerId: string,
): Promise<CustomerFieldValueRecord[]> {
  const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Customer fields could not be loaded.");
  const updatedAt = body.customer?.updatedAt ?? new Date().toISOString();
  return Object.entries(body.customFieldValues ?? {}).map(([fieldId, value]) => ({
    customerId,
    fieldId,
    updatedAt,
    value: value as string | boolean,
  }));
}

export async function getCustomerFieldValues(
  customerId: string,
): Promise<CustomerFieldValueMap> {
  return Object.fromEntries(
    (await getCustomerFieldValueRecords(customerId)).map((record) => [
      record.fieldId,
      record.value,
    ]),
  );
}

export async function customerFieldHasData(fieldId: string) {
  const response = await fetch(
    `/api/settings/customer-fields/${encodeURIComponent(fieldId)}/usage`,
    { cache: "no-store" },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Field usage could not be checked.");
  return body.hasData === true;
}

export function validateCustomerFieldDefinitions(fields: CustomerFieldDefinition[]) {
  const errors: Record<string, string> = {};
  const labels = new Map<string, string>();
  fields.forEach((field) => {
    const label = field.label.trim();
    if (!label) errors[`field.${field.id}.label`] = "Field label is required.";
    const normalized = label.toLowerCase();
    if (normalized && labels.has(normalized)) {
      errors[`field.${field.id}.label`] = "Field labels must be unique.";
      errors[`field.${labels.get(normalized)}.label`] = "Field labels must be unique.";
    } else if (normalized) labels.set(normalized, field.id);
    if (field.type === "Dropdown") {
      const options = field.options.map((option) => option.label.trim()).filter(Boolean);
      if (!options.length) {
        errors[`field.${field.id}.options`] =
          "Dropdown fields require at least one option.";
      }
      if (
        new Set(options.map((option) => option.toLowerCase())).size !==
        options.length
      ) {
        errors[`field.${field.id}.options`] =
          "Dropdown option labels must be unique.";
      }
    }
  });
  return errors;
}

export async function saveCustomerFieldDefinitions(
  fields: CustomerFieldDefinition[],
) {
  const errors = validateCustomerFieldDefinitions(fields);
  if (Object.keys(errors).length) throw new CustomerFieldsValidationError(errors);
  const response = await fetch("/api/settings/customer-fields", {
    body: JSON.stringify({ fields }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Customer fields could not be saved.");
  cachedDefinitions = (body.fields as CustomerFieldDefinition[]).map(cloneDefinition);
  return cachedDefinitions.map(cloneDefinition);
}

export function validateCustomerFieldValues(values: CustomerFieldValueMap) {
  const errors: Record<string, string> = {};
  cachedDefinitions.filter((field) => field.isActive).forEach((field) => {
    const value = values[field.id];
    const empty = value === undefined || value === "" || value === false;
    const key = `customFields.${field.id}`;
    if (field.required && empty) {
      errors[key] = `${field.label} is required.`;
      return;
    }
    if (empty || typeof value === "boolean") return;
    if (field.type === "Number" && !Number.isFinite(Number(value))) {
      errors[key] = `${field.label} must be a number.`;
    }
    if (field.type === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[key] = `Enter a valid email for ${field.label}.`;
    }
    if (
      field.type === "Phone" &&
      (value.replace(/\D/g, "").length < 8 || value.replace(/\D/g, "").length > 15)
    ) {
      errors[key] = `Enter a valid phone number for ${field.label}.`;
    }
    if (field.type === "Date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors[key] = `Choose a valid date for ${field.label}.`;
    }
    if (
      field.type === "Dropdown" &&
      !field.options.some((option) => option.id === value)
    ) {
      errors[key] = `Choose a valid option for ${field.label}.`;
    }
  });
  return errors;
}

export async function saveCustomerFieldValues(
  customerId: string,
  _values: CustomerFieldValueMap,
) {
  void _values;
  return getCustomerFieldValueRecords(customerId);
}

export function createCustomerFieldDefinition(
  sortOrder: number,
): CustomerFieldDefinition {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    id: `customer-field-${crypto.randomUUID()}`,
    isActive: true,
    label: "",
    options: [],
    required: false,
    sortOrder,
    type: "Text",
    updatedAt: now,
  };
}

export function createCustomerFieldOption(sortOrder: number) {
  return {
    id: `customer-field-option-${crypto.randomUUID()}`,
    label: "",
    sortOrder,
  };
}

export function formatCustomerFieldValue(
  field: CustomerFieldDefinition,
  value: string | boolean | undefined,
) {
  if (value === undefined || value === "") return "Not provided";
  if (field.type === "Checkbox") return value ? "Yes" : "No";
  if (field.type === "Dropdown") {
    return field.options.find((option) => option.id === value)?.label ?? "Not provided";
  }
  return String(value);
}

function cloneDefinition(field: CustomerFieldDefinition): CustomerFieldDefinition {
  return {
    ...field,
    options: field.options.map((option) => ({ ...option })),
  };
}
