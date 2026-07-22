export type CustomerCustomFieldType = "Text" | "Number" | "Email" | "Phone" | "Date" | "Dropdown" | "Checkbox" | "Textarea";
export type CustomerCustomFieldValue = string | boolean;

export type CustomerFieldOption = {
  id: string;
  label: string;
  sortOrder: number;
};

export type CustomerFieldDefinition = {
  id: string;
  label: string;
  type: CustomerCustomFieldType;
  required: boolean;
  isActive: boolean;
  sortOrder: number;
  options: CustomerFieldOption[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerFieldValueRecord = {
  customerId: string;
  fieldId: string;
  value: CustomerCustomFieldValue;
  updatedAt: string;
};

export type CustomerFieldValueMap = Record<string, CustomerCustomFieldValue>;
