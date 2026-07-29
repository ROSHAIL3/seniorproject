import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type {
  CustomerFieldDefinition,
  CustomerCustomFieldType,
} from "@/types/customer-fields";
import type {
  ServiceBookingFieldDefinition,
  ServiceBookingFieldType,
} from "@/types/services";

const customerTypeFromDatabase = {
  checkbox: "Checkbox",
  date: "Date",
  dropdown: "Dropdown",
  email: "Email",
  number: "Number",
  phone: "Phone",
  text: "Text",
  textarea: "Textarea",
} as const satisfies Record<string, CustomerCustomFieldType>;
const customerTypeToDatabase = Object.fromEntries(
  Object.entries(customerTypeFromDatabase).map(([key, value]) => [value, key]),
) as Record<CustomerCustomFieldType, keyof typeof customerTypeFromDatabase>;

const serviceTypeFromDatabase = {
  checkbox: "Checkbox",
  date: "Date",
  dropdown: "Dropdown",
  number: "Number",
  text: "Text",
  textarea: "Textarea",
} as const satisfies Record<string, ServiceBookingFieldType>;
const serviceTypeToDatabase = Object.fromEntries(
  Object.entries(serviceTypeFromDatabase).map(([key, value]) => [value, key]),
) as Record<ServiceBookingFieldType, keyof typeof serviceTypeFromDatabase>;

export async function getCustomerFieldDefinitionsFromDatabase(
  includeInactive = false,
) {
  const supabase = await createClient();
  const [{ data: fields, error }, { data: options }] = await Promise.all([
    supabase
      .from("customer_field_definitions")
      .select("*")
      .order("sort_order"),
    supabase.from("customer_field_options").select("*").order("sort_order"),
  ]);
  if (error) throw new Error("Customer field definitions could not be loaded.");
  return (fields ?? [])
    .filter((field) => includeInactive || field.is_active)
    .map((field) => ({
      createdAt: field.created_at,
      id: field.id,
      isActive: field.is_active,
      label: field.label,
      options: (options ?? [])
        .filter((option) => option.field_id === field.id)
        .map((option) => ({
          id: option.id,
          label: option.label,
          sortOrder: option.sort_order,
        })),
      required: field.required,
      sortOrder: field.sort_order,
      type: customerTypeFromDatabase[field.type],
      updatedAt: field.updated_at,
    }) satisfies CustomerFieldDefinition);
}

export async function saveCustomerFieldDefinitionsInDatabase(
  fields: CustomerFieldDefinition[],
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_customer_field_definitions", {
    target_fields: fields.map((field, index) => ({
      id: field.id,
      label: field.label,
      options: field.type === "Dropdown"
        ? field.options.map((option, optionIndex) => ({
            id: option.id,
            label: option.label,
            sort_order: optionIndex,
          }))
        : [],
      required: field.required,
      sort_order: index,
      type: customerTypeToDatabase[field.type],
    })) as unknown as Json,
  });
  if (error) throw new Error(fieldError(error.message));
  return getCustomerFieldDefinitionsFromDatabase();
}

export async function customerFieldHasDataInDatabase(fieldId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("custom_values");
  if (error) throw new Error("Customer field usage could not be checked.");
  return (data ?? []).some((row) => {
    const values = row.custom_values;
    return Boolean(
      values &&
        typeof values === "object" &&
        !Array.isArray(values) &&
        fieldId in values &&
        values[fieldId] !== "" &&
        values[fieldId] !== false,
    );
  });
}

export async function getServiceBookingFieldsFromDatabase(
  serviceId: string,
  includeInactive = false,
) {
  const supabase = await createClient();
  const [{ data: fields, error }, { data: options }] = await Promise.all([
    supabase
      .from("service_booking_field_definitions")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order"),
    supabase.from("service_booking_field_options").select("*").order("sort_order"),
  ]);
  if (error) throw new Error("Service booking fields could not be loaded.");
  return (fields ?? [])
    .filter((field) => includeInactive || field.is_active)
    .map((field) => ({
      createdAt: field.created_at,
      id: field.id,
      isActive: field.is_active,
      label: field.label,
      options: (options ?? [])
        .filter((option) => option.field_id === field.id)
        .map((option) => ({
          id: option.id,
          label: option.label,
          sortOrder: option.sort_order,
        })),
      required: field.required,
      serviceId: field.service_id,
      sortOrder: field.sort_order,
      type: serviceTypeFromDatabase[field.type],
      updatedAt: field.updated_at,
    }) satisfies ServiceBookingFieldDefinition);
}

export async function saveServiceBookingFieldsInDatabase(
  serviceId: string,
  fields: ServiceBookingFieldDefinition[],
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_service_booking_fields", {
    target_fields: fields.map((field, index) => ({
      id: field.id,
      label: field.label,
      options: field.type === "Dropdown"
        ? field.options.map((option, optionIndex) => ({
            id: option.id,
            label: option.label,
            sort_order: optionIndex,
          }))
        : [],
      required: field.required,
      sort_order: index,
      type: serviceTypeToDatabase[field.type],
    })) as unknown as Json,
    target_service_id: serviceId,
  });
  if (error) throw new Error(fieldError(error.message));
  return getServiceBookingFieldsFromDatabase(serviceId);
}

function fieldError(message: string) {
  if (message.includes("FORBIDDEN")) return "You do not have permission to update these fields.";
  if (message.includes("DUPLICATE")) return "Field labels, ordering, and option labels must be unique.";
  if (message.includes("OPTIONS_REQUIRED")) return "Dropdown fields require at least one option.";
  if (message.includes("INVALID")) return "The field configuration is invalid.";
  return "The field configuration could not be saved.";
}
