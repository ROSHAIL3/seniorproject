import type {
  ServiceBookingFieldDefinition,
  ServiceBookingFieldValueMap,
} from "@/types/services";

export class ServiceBookingFieldsValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Please correct the service booking fields.");
  }
}

const cache = new Map<string, ServiceBookingFieldDefinition[]>();

export function subscribeToServiceBookingFields(_listener?: () => void) {
  void _listener;
  return () => undefined;
}

export async function getServiceBookingFields(
  serviceId: string,
  includeInactive = false,
) {
  const response = await fetch(
    `/api/settings/services/${encodeURIComponent(serviceId)}/booking-fields?includeInactive=${includeInactive}`,
    { cache: "no-store" },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Booking fields could not be loaded.");
  const fields = (body.fields as ServiceBookingFieldDefinition[]).map(cloneDefinition);
  cache.set(serviceId, fields.map(cloneDefinition));
  return fields;
}

export function createServiceBookingField(
  serviceId: string,
  sortOrder: number,
): ServiceBookingFieldDefinition {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    id: `service-field-${crypto.randomUUID()}`,
    isActive: true,
    label: "",
    options: [],
    required: false,
    serviceId,
    sortOrder,
    type: "Text",
    updatedAt: now,
  };
}

export function createServiceBookingFieldOption(sortOrder: number) {
  return {
    id: `service-field-option-${crypto.randomUUID()}`,
    label: "",
    sortOrder,
  };
}

export async function saveServiceBookingFields(
  serviceId: string,
  fields: ServiceBookingFieldDefinition[],
) {
  const errors = validateDefinitions(fields);
  if (Object.keys(errors).length) {
    throw new ServiceBookingFieldsValidationError(errors);
  }
  const response = await fetch(
    `/api/settings/services/${encodeURIComponent(serviceId)}/booking-fields`,
    {
      body: JSON.stringify({ fields }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Booking fields could not be saved.");
  const saved = (body.fields as ServiceBookingFieldDefinition[]).map(cloneDefinition);
  cache.set(serviceId, saved.map(cloneDefinition));
  return saved;
}

export async function validateAppointmentServiceFieldValues(
  serviceId: string,
  values: ServiceBookingFieldValueMap,
) {
  const fields = cache.get(serviceId) ?? (await getServiceBookingFields(serviceId));
  const errors: Record<string, string> = {};
  fields.filter((field) => field.isActive).forEach((field) => {
    const value = values[field.id];
    const empty = value === undefined || value === "" || value === false;
    const key = `serviceFields.${field.id}`;
    if (field.required && empty) {
      errors[key] = `${field.label} is required.`;
      return;
    }
    if (empty || typeof value === "boolean") return;
    if (field.type === "Number" && !Number.isFinite(Number(value))) {
      errors[key] = `${field.label} must be a number.`;
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

export async function saveAppointmentServiceFieldValues(
  appointmentId: string,
  _serviceId: string,
  _values: ServiceBookingFieldValueMap,
) {
  void _serviceId;
  void _values;
  return getAppointmentServiceFieldValues(appointmentId);
}

export async function getAppointmentServiceFieldValues(
  appointmentId: string,
): Promise<ServiceBookingFieldValueMap> {
  const response = await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Appointment fields could not be loaded.");
  return body.serviceFieldValues ?? {};
}

export async function getAppointmentServiceFieldDetails(
  appointmentId: string,
  serviceId: string,
) {
  const values = await getAppointmentServiceFieldValues(appointmentId);
  const fields = (await getServiceBookingFields(serviceId, true)).filter(
    (field) => values[field.id] !== undefined,
  );
  return fields.map((field) => ({ field, value: values[field.id] }));
}

function validateDefinitions(fields: ServiceBookingFieldDefinition[]) {
  const errors: Record<string, string> = {};
  const labels = new Set<string>();
  fields.forEach((field) => {
    const label = field.label.trim();
    if (!label) errors[`field.${field.id}.label`] = "Field label is required.";
    else if (labels.has(label.toLowerCase())) {
      errors[`field.${field.id}.label`] = "Field labels must be unique.";
    } else labels.add(label.toLowerCase());
    if (field.type === "Dropdown") {
      const options = field.options.map((option) => option.label.trim()).filter(Boolean);
      if (!options.length) {
        errors[`field.${field.id}.options`] = "Add at least one dropdown option.";
      }
      if (
        new Set(options.map((option) => option.toLowerCase())).size !==
        options.length
      ) {
        errors[`field.${field.id}.options`] = "Dropdown options must be unique.";
      }
    }
  });
  return errors;
}

function cloneDefinition(
  field: ServiceBookingFieldDefinition,
): ServiceBookingFieldDefinition {
  return {
    ...field,
    options: field.options.map((option) => ({ ...option })),
  };
}
