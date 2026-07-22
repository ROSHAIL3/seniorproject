import Link from "next/link";
import { cn } from "@/app/(landing)/lib/utils";

type ButtonVariant = "primary" | "secondary" | "tertiary";

type SharedProps = {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
};

type AnchorProps = SharedProps & {
  href: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type ButtonProps = SharedProps & {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  variant = "secondary",
  children,
  className,
  ...props
}: ButtonProps | AnchorProps) {
  const baseStyles =
    "flex items-start px-[35px] py-[20px] max-xl:px-[25px] max-xl:py-[15px] max-sm:px-[20px] max-sm:py-[10px] relative rounded-[14px] shrink-0 font-normal leading-[28px] text-[20px] text-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-[#191a23] text-white hover:bg-[#2a2b35]",
    secondary:
      "border border-[#191a23] border-solid text-black hover:bg-[#f5f5f5]",
    tertiary: "bg-[#b9ff66] text-black hover:bg-[#a8e55a]",
  };

  const combinedClassName = cn(baseStyles, variantStyles[variant], className);

  if ("href" in props) {
    return (
      <Link {...props} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={combinedClassName}>
      {children}
    </button>
  );
}
