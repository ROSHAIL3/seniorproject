"use client";

import DatePickerControl from "./DatePickerControl";
import Label from "./Label";

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: (dates: Date[], currentDateString: string) => void;
  defaultDate?: Date | string | number;
  label?: string;
  placeholder?: string;
};

function normalizeDefaultDate(value?: Date | string | number) {
  if (value === undefined || value === "") return "";
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00Z`)
        : new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function DatePicker({
  id,
  onChange,
  label,
  defaultDate,
  placeholder,
}: PropsType) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <DatePickerControl
        id={id}
        defaultValue={normalizeDefaultDate(defaultDate)}
        placeholder={placeholder}
        ariaLabel={label ?? "Choose date"}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-300 bg-transparent px-3.5 py-2 text-left text-[13px] text-gray-800 shadow-theme-xs transition placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
        onChange={(dateString) => {
          const selectedDate = dateString
            ? new Date(`${dateString}T00:00:00Z`)
            : null;
          onChange?.(selectedDate ? [selectedDate] : [], dateString);
        }}
      />
    </div>
  );
}
