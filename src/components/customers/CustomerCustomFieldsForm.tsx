"use client";

import Checkbox from "@/components/form/input/Checkbox";
import EmailInput from "@/components/form/input/EmailInput";
import Input from "@/components/form/input/InputField";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { useCustomerFields } from "@/hooks/useCustomerFields";
import type { CustomerFieldValueMap, CustomerCustomFieldValue } from "@/types/customer-fields";

export default function CustomerCustomFieldsForm({ values, onChange, errors = {} }: { values: CustomerFieldValueMap; onChange: (values: CustomerFieldValueMap) => void; errors?: Partial<Record<string, string>> }) {
  const fields = useCustomerFields();
  const setValue = (fieldId: string, value: CustomerCustomFieldValue) => onChange({ ...values, [fieldId]: value });
  if (!fields.length) return null;
  return <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800"><p className="text-sm font-semibold text-gray-800 dark:text-white/90">Additional Information</p>{fields.map((field) => { const error = errors[`customFields.${field.id}`]; const value = typeof values[field.id] === "string" ? String(values[field.id]) : ""; return <div key={field.id}><Label>{field.label} {field.required && <span className="text-error-500">*</span>}</Label>{field.type === "Textarea" ? <TextArea rows={3} value={value} error={!!error} onChange={(next) => setValue(field.id, next)} /> : field.type === "Dropdown" ? <Select key={`${field.id}-${value}`} options={field.options.map((option) => ({ value: option.id, label: option.label }))} defaultValue={value} onChange={(next) => setValue(field.id, next)} placeholder={`Select ${field.label}`} /> : field.type === "Checkbox" ? <Checkbox id={field.id} label={field.label} checked={values[field.id] === true} onChange={(next) => setValue(field.id, next)} /> : field.type === "Email" ? <EmailInput value={value} error={!!error} onChange={(event) => setValue(field.id, event.target.value)} /> : field.type === "Phone" ? <PhoneInput value={value} error={!!error} onChange={(next) => setValue(field.id, next)} /> : <Input type={field.type === "Number" ? "number" : field.type === "Date" ? "date" : "text"} value={value} error={!!error} onChange={(event) => setValue(field.id, event.target.value)} />}{error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}</div>; })}</div>;
}
