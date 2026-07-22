import React, { FC, ReactNode } from "react";
import { MailIcon } from "@/icons";
import PhoneInput from "@/components/form/group-input/PhoneInput";

export interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
  autoComplete?: string;
  ariaLabel?: string;
  startIcon?: ReactNode;
  startIconDivider?: boolean;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  defaultValue,
  value,
  onChange,
  onBlur,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  autoComplete,
  ariaLabel,
  startIcon,
  startIconDivider = false,
}) => {
  if (type === "tel") {
    return <div><PhoneInput id={id} name={name} value={value === undefined ? undefined : String(value)} defaultValue={defaultValue === undefined ? undefined : String(defaultValue)} placeholder={placeholder} disabled={disabled} error={error} autoComplete={autoComplete} ariaLabel={ariaLabel} className={className} onChange={(phone) => onChange?.({ target: { value: phone } } as React.ChangeEvent<HTMLInputElement>)} onBlur={() => onBlur?.({} as React.FocusEvent<HTMLInputElement>)} />{hint && <p className={`mt-1.5 text-xs ${error ? "text-error-500" : success ? "text-success-500" : "text-gray-500"}`}>{hint}</p>}</div>;
  }
  const fieldIcon = startIcon ?? (type === "email" ? <MailIcon /> : undefined);
  // Determine input styles based on state (disabled, success, error)
  let inputClasses = `h-10 w-full rounded-lg border appearance-none ${fieldIcon ? startIconDivider ? "pl-12 pr-3.5" : "pl-10 pr-3.5" : "px-3.5"} py-2 text-[13px] shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`;

  // Add styles for the different states
  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500`;
  } else if (success) {
    inputClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      {fieldIcon && (
        <span className={`pointer-events-none absolute inset-y-0 left-0 z-10 inline-flex h-full items-center justify-center overflow-visible leading-none text-gray-500 dark:text-gray-400 [&>svg]:block [&>svg]:max-h-4 [&>svg]:max-w-4 [&>svg]:shrink-0 [&>svg]:overflow-visible ${startIconDivider ? "w-10 rounded-l-lg border-r border-gray-300 dark:border-gray-700" : "ml-2.5 w-5"}`}>
          {fieldIcon}
        </span>
      )}
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className={inputClasses}
      />

      {/* Optional Hint Text */}
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
