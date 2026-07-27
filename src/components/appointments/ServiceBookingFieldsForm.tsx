"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import type {
  ServiceBookingFieldDefinition,
  ServiceBookingFieldValue,
  ServiceBookingFieldValueMap,
} from "@/types/services";

type ServiceBookingFieldsFormProps = {
  fields: ServiceBookingFieldDefinition[];
  values: ServiceBookingFieldValueMap;
  onChange: (values: ServiceBookingFieldValueMap) => void;
  errors?: Record<string, string>;
};

export default function ServiceBookingFieldsForm({
  fields,
  values,
  onChange,
  errors = {},
}: ServiceBookingFieldsFormProps) {
  const set = (id: string, value: ServiceBookingFieldValue) =>
    onChange({ ...values, [id]: value });

  if (!fields.length) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
      <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
        Service details
      </h3>
      <div className="space-y-2">
        {fields.map((field) => {
          const error = errors[`serviceFields.${field.id}`];
          const value = String(values[field.id] ?? "");

          return (
            <div key={field.id}>
              <Label>
                {field.label}
                {field.required && (
                  <span className="text-error-500"> *</span>
                )}
              </Label>
              {field.type === "Textarea" ? (
                <TextArea
                  value={value}
                  error={!!error}
                  onChange={(nextValue) => set(field.id, nextValue)}
                />
              ) : field.type === "Dropdown" ? (
                <Select
                  key={value}
                  options={field.options.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  defaultValue={value}
                  placeholder="Select an option"
                  onChange={(nextValue) => set(field.id, nextValue)}
                />
              ) : field.type === "Checkbox" ? (
                <Checkbox
                  label={field.label}
                  checked={Boolean(values[field.id])}
                  onChange={(nextValue) => set(field.id, nextValue)}
                />
              ) : (
                <Input
                  type={
                    field.type === "Number"
                      ? "number"
                      : field.type === "Date"
                        ? "date"
                        : "text"
                  }
                  value={value}
                  error={!!error}
                  onChange={(event) => set(field.id, event.target.value)}
                />
              )}
              {error && (
                <p className="mt-1 text-xs text-error-500">{error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
