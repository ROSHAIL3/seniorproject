import { cn } from "@/app/(landing)/lib/utils";

type InputRadioProps = {
  name: string;
  value: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  className?: string;
  dataName?: string;
};

export default function InputRadio({
  name,
  value,
  defaultChecked,
  checked,
  onChange,
  label,
  className,
  dataName,
}: InputRadioProps) {
  return (
    <label
      className={cn(
        "inline-grid grid-cols-[max-content] grid-rows-[max-content] justify-items-start relative shrink-0 cursor-pointer",
        className
      )}
      data-name={dataName || label}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        className="sr-only [&:checked+div_div]:scale-100 [&:checked+div_div]:opacity-100"
      />
      <div className="col-1 ml-0 mt-0 relative row-1 size-[28px]">
        <div className="absolute inset-[-3.57%]">
          <div className="bg-white border border-black border-solid rounded-full size-full flex items-center justify-center">
            <div
              className={cn(
                "bg-[#B9FF66] rounded-full size-[16px] transition-all duration-300 ease-in-out",
                "scale-50 opacity-0"
              )}
            />
          </div>
        </div>
      </div>
      <p className="col-1 font-normal leading-[normal] ml-[42px] mt-[2px] relative row-1 text-[18px] text-black">
        {label}
      </p>
    </label>
  );
}
