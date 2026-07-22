export type ServiceKind = "service" | "package";
export type ServiceCategoryStatus = "Active" | "Archived";

export type ServiceCategory = {
  id: string;
  name: string;
  status: ServiceCategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  name: string;
  kind: ServiceKind;
  categoryId: string;
  description: string;
  durationMinutes: number;
  priceBhd: number;
  imageUrl: string;
  staffIds: string[];
  isActive: boolean;
  vatApplicable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceInput = Pick<Service, "name" | "kind" | "categoryId" | "description" | "durationMinutes" | "priceBhd" | "imageUrl" | "staffIds" | "isActive" | "vatApplicable">;
export type ServiceFieldErrors = Partial<Record<keyof ServiceInput | "form", string>>;
export type ServiceCategoryInput = Pick<ServiceCategory, "name" | "status">;

export const serviceBookingFieldTypes = ["Text", "Number", "Date", "Dropdown", "Checkbox", "Textarea"] as const;
export type ServiceBookingFieldType = (typeof serviceBookingFieldTypes)[number];
export type ServiceBookingFieldOption = { id: string; label: string; sortOrder: number };
export type ServiceBookingFieldDefinition = {
  id: string;
  serviceId: string;
  label: string;
  type: ServiceBookingFieldType;
  required: boolean;
  isActive: boolean;
  sortOrder: number;
  options: ServiceBookingFieldOption[];
  createdAt: string;
  updatedAt: string;
};
export type ServiceBookingFieldValue = string | boolean;
export type ServiceBookingFieldValueMap = Record<string, ServiceBookingFieldValue>;
export type AppointmentServiceFieldValueRecord = { appointmentId: string; fieldId: string; value: ServiceBookingFieldValue; updatedAt: string };
export type AppointmentServiceFieldDetail = { field: ServiceBookingFieldDefinition; value: ServiceBookingFieldValue };

export type QuickAddTemplate = { id: string; name: string; durationMinutes: number; priceBhd: number; description: string };
export type QuickAddCategory = { name: string; templates: QuickAddTemplate[] };
