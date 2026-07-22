"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import type { ServiceBookingFieldDefinition, ServiceBookingFieldValue, ServiceBookingFieldValueMap } from "@/types/services";

export default function ServiceBookingFieldsForm({ fields, values, onChange, errors = {} }: { fields: ServiceBookingFieldDefinition[]; values: ServiceBookingFieldValueMap; onChange: (values: ServiceBookingFieldValueMap) => void; errors?: Record<string, string> }) {
  const set = (id: string, value: ServiceBookingFieldValue) => onChange({ ...values, [id]: value });
  if (!fields.length) return null;
  return <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800"><h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Service details</h3><div className="space-y-4">{fields.map((field) => { const error = errors[`serviceFields.${field.id}`]; return <div key={field.id}><Label>{field.label}{field.required && <span className="text-error-500"> *</span>}</Label>{field.type === "Textarea" ? <TextArea value={String(values[field.id] ?? "")} error={!!error} onChange={(value) => set(field.id, value)} /> : field.type === "Dropdown" ? <Select key={String(values[field.id] ?? "")} options={field.options.map((option) => ({ value: option.id, label: option.label }))} defaultValue={String(values[field.id] ?? "")} placeholder="Select an option" onChange={(value) => set(field.id, value)} /> : field.type === "Checkbox" ? <Checkbox label={field.label} checked={Boolean(values[field.id])} onChange={(value) => set(field.id, value)} /> : <Input type={field.type === "Number" ? "number" : field.type === "Date" ? "date" : "text"} value={String(values[field.id] ?? "")} error={!!error} onChange={(event) => set(field.id, event.target.value)} />}{error && <p className="mt-1 text-xs text-error-500">{error}</p>}</div>; })}</div></div>;
}
