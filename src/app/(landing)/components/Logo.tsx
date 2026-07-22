import LogoIcon from "@/app/(landing)/assets/icons/logo-icon.svg";
import LogoPositivus from "@/app/(landing)/assets/icons/logo-positivus.svg";
import { cn } from "../lib/utils";

export default function Logo({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="img"
      aria-label="Positivus Logo"
      {...props}
      className={cn("relative", className)}
    >
      <div className="absolute inset-[0_83.6%_0_0]">
        <LogoIcon
          className="block max-w-none size-full fill-current"
          width={36}
          height={36}
        />
      </div>
      <div className="absolute inset-[8.33%_0_12.33%_22.28%]">
        <LogoPositivus
          className="block max-w-none size-full fill-current"
          width={170}
          height={28}
        />
      </div>
    </div>
  );
}
