import { cn } from "@/app/(landing)/lib/utils";
import { HTMLInputAutoCompleteAttribute } from "react";

type InputTextProps = {
  id: string;
  name: string;
  type?: "text" | "email" | "tel" | "password" | "textarea";
  autoComplete?: HTMLInputAutoCompleteAttribute;
  value?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  dataName?: string;
};

export default function InputText({
  id,
  name,
  type = "text",
  autoComplete,
  value,
  onChange,
  label,
  placeholder,
  required = false,
  rows = 8,
  className,
  inputClassName,
  dataName,
}: InputTextProps) {
  const isTextarea = type === "textarea";

  const containerClassName = cn(
    "flex flex-col gap-[4px] items-start relative shrink-0",
    isTextarea && "h-[223px]",
    className
  );

  const baseInputClassName =
    "bg-white border border-black border-solid flex items-start overflow-clip px-[30px] py-[18px] max-sm:px-[20px] max-sm:py-[16px] relative rounded-[14px] shrink-0 w-full font-normal text-[18px]/[21px] text-black placeholder:text-[#898989] focus:outline-none focus:ring-2 focus:ring-[#191a23] focus:ring-offset-2";

  const textareaClassName = cn(
    baseInputClassName,
    "h-[190px] resize-none",
    inputClassName
  );

  const inputClassNameFinal = cn(baseInputClassName, inputClassName);

  return (
    <div className={containerClassName} data-name={dataName || "Field"}>
      <label
        htmlFor={id}
        className="font-normal relative shrink-0 text-[16px]/[28px] text-black"
      >
        {label}
      </label>
      {isTextarea ? (
        <textarea
          id={id}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={textareaClassName}
          data-name="Input"
        />
      ) : (
        <input
          type={type}
          id={id}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={inputClassNameFinal}
          data-name="Input"
        />
      )}
    </div>
  );
}
