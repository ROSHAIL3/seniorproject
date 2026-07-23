import Image from "next/image";

type BrandLogoSize = "sm" | "md" | "lg";

type BrandLogoProps = {
  className?: string;
  iconOnly?: boolean;
  inverted?: boolean;
  priority?: boolean;
  size?: BrandLogoSize;
};

const sizeClasses: Record<BrandLogoSize, { mark: string; name: string; gap: string }> = {
  sm: { mark: "size-7", name: "text-[18px]", gap: "gap-2" },
  md: { mark: "size-8", name: "text-[21px]", gap: "gap-2.5" },
  lg: { mark: "size-9", name: "text-[24px]", gap: "gap-3" },
};

export default function BrandLogo({
  className = "",
  iconOnly = false,
  priority = false,
  size = "md",
}: BrandLogoProps) {
  const styles = sizeClasses[size];

  return (
    <span
      role="img"
      aria-label="SLOTOVA"
      className={`inline-flex shrink-0 items-center ${styles.gap} ${className}`}
    >
      <Image
        src="/images/logo/slotova-mark.svg"
        width={36}
        height={36}
        priority={priority}
        alt=""
        aria-hidden="true"
        className={`${styles.mark} shrink-0 object-contain`}
      />
      {!iconOnly && (
        <span
          className={`font-space-grotesk font-semibold leading-none tracking-[-0.045em] ${styles.name}`}
        >
          SLOTOVA
        </span>
      )}
    </span>
  );
}
