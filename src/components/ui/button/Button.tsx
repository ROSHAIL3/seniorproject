import Link from "next/link";
import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  href?: string;
}

const iconSlotClass =
  "inline-flex size-[18px] shrink-0 items-center justify-center [&>svg]:block [&>svg]:size-[18px]";

export default function Button({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
  href,
}: ButtonProps) {
  const sizeClasses = {
    sm: "min-h-9 px-3.5 py-2 text-[13px]",
    md: "min-h-10 px-4 py-2.5 text-sm",
  };

  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-white",
  };

  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-medium leading-none transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${
    disabled ? "cursor-not-allowed opacity-50" : ""
  } ${className}`;

  const content = (
    <>
      {startIcon && <span className={iconSlotClass}>{startIcon}</span>}
      <span className="whitespace-nowrap">{children}</span>
      {endIcon && <span className={iconSlotClass}>{endIcon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
