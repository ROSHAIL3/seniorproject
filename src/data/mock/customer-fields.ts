import type { CustomerFieldDefinition, CustomerFieldValueRecord } from "@/types/customer-fields";

export const mockCustomerFieldDefinitions: CustomerFieldDefinition[] = [
  { id: "customer-field-cpr", label: "CPR Number", type: "Number", required: false, isActive: true, sortOrder: 0, options: [], createdAt: "2026-07-01T08:00:00.000Z", updatedAt: "2026-07-01T08:00:00.000Z" },
];

export const mockCustomerFieldValues: CustomerFieldValueRecord[] = [
  { customerId: "customer-1", fieldId: "customer-field-cpr", value: "900101123", updatedAt: "2026-07-01T08:00:00.000Z" },
];
