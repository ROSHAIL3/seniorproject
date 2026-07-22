import { cn } from "../lib/utils";

type PlusIconProps = {
  isExpanded: boolean;
  className?: string;
};

export default function PlusIcon({ isExpanded, className }: PlusIconProps) {
  return (
    <div
      className={className}
      data-name={isExpanded ? "Minus" : "Plus"}
      role="button"
      aria-label={isExpanded ? "Collapse" : "Expand"}
    >
      <svg
        width="58"
        height="58"
        viewBox="0 0 58 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
      >
        <circle
          cx="29"
          cy="29"
          r="28"
          fill="#F3F3F3"
          stroke="#191a23"
          strokeWidth="1"
        />
        <g
          stroke="#191A23"
          strokeWidth="5.64"
          strokeLinecap="butt"
          className={cn(
            "transition-all duration-300 origin-center",
            isExpanded ? "rotate-0" : "rotate-180"
          )}
        >
          <path
            d={isExpanded ? "M20.12 29 H37.88" : "M16.12 29 H40.88"}
            className="transition-all duration-300"
          />
          <path
            d={isExpanded ? "M29 29 V29" : "M29 16.12 V40.88"}
            className="transition-all duration-300"
          />
        </g>
      </svg>
    </div>
  );
}
