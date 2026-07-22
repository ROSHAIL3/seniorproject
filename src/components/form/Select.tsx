"use client";

import { useMemo, useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { CheckLineIcon, ChevronDownIcon } from "@/icons";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

export default function Select({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
}: SelectProps) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  const selectOption = (value: string) => {
    setSelectedValue(value);
    setIsOpen(false);
    onChange(value);
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`dropdown-toggle flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-left text-[13px] shadow-theme-xs transition-colors hover:border-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:focus:border-brand-800 ${
          selectedOption
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-400"
        } ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDownIcon
          className={`max-h-[18px] max-w-[18px] shrink-0 overflow-visible text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand-500" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="left-0 right-auto z-50 w-full min-w-max overflow-hidden p-1.5 dark:bg-gray-900"
      >
        <div role="listbox" className="max-h-64 overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === selectedValue;
            return (
              <DropdownItem
                key={option.value}
                onClick={() => selectOption(option.value)}
                baseClassName={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                  isSelected
                    ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <CheckLineIcon className="max-h-4 max-w-4 shrink-0 overflow-visible text-brand-500" />
                )}
              </DropdownItem>
            );
          })}
        </div>
      </Dropdown>
    </div>
  );
}
