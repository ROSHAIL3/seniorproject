import BrandLogo from "@/components/common/BrandLogo";
import { cn } from "../lib/utils";

export default function Logo({
  className,
  inverted = false,
  size = "lg",
}: {
  className?: string;
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <BrandLogo
      inverted={inverted}
      size={size}
      className={cn("relative", className)}
    />
  );
}
