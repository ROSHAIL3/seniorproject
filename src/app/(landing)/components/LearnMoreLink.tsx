import { cn } from "@/app/(landing)/lib/utils";

type LearnMoreLinkVariant =
  | "White"
  | "White2"
  | "Black"
  | "Black2"
  | "Green"
  | "Green2"
  | "SimpleGreen"
  | "SimpleWhite"
  | "SimpleBlack";

type LearnMoreLinkProps = {
  variant?: LearnMoreLinkVariant;
  children?: React.ReactNode;
  className?: string;
};

// Arrow SVG path d attribute - reusable constant
const ARROW_PATH_D =
  "M11.2501 24.7009C10.5326 25.1151 10.2868 26.0325 10.701 26.75C11.1152 27.4674 12.0326 27.7132 12.7501 27.299L11.2501 24.7009ZM30.7694 16.3882C30.9839 15.588 30.509 14.7655 29.7088 14.5511L16.6688 11.057C15.8686 10.8426 15.0461 11.3175 14.8317 12.1177C14.6173 12.9179 15.0921 13.7404 15.8923 13.9548L27.4834 17.0606L24.3776 28.6517C24.1632 29.4519 24.6381 30.2744 25.4383 30.4888C26.2385 30.7033 27.061 30.2284 27.2754 29.4282L30.7694 16.3882ZM12.7501 27.299L30.0706 17.299L28.5706 14.7009L11.2501 24.7009L12.7501 27.299Z";
const SIMPLE_ARROW_PATH_D =
  "M0.750252 13.6954C0.0328128 14.1096 -0.213 15.027 0.201214 15.7444C0.615427 16.4619 1.53281 16.7077 2.25025 16.2935L0.750252 13.6954ZM20.2696 5.38266C20.4841 4.58246 20.0092 3.75995 19.209 3.54554L6.16899 0.0514847C5.36879 -0.162928 4.54629 0.311945 4.33187 1.11215C4.11746 1.91234 4.59233 2.73485 5.39253 2.94926L16.9836 6.05509L13.8778 17.6462C13.6634 18.4464 14.1383 19.2689 14.9385 19.4833C15.7387 19.6977 16.5612 19.2229 16.7756 18.4227L20.2696 5.38266ZM2.25025 16.2935L19.5708 6.29347L18.0708 3.69539L0.750252 13.6954L2.25025 16.2935Z";

type ArrowIconProps = {
  isSimple: boolean;
  circleFill: string;
  arrowFill: string;
};

// Arrow icon component
function ArrowIcon({ isSimple, circleFill, arrowFill }: ArrowIconProps) {
  const width = isSimple ? 21 : 41;
  const height = isSimple ? 20 : 41;
  const viewBox = isSimple ? "0 0 21 20" : "0 0 41 41";
  const pathD = isSimple ? SIMPLE_ARROW_PATH_D : ARROW_PATH_D;

  return (
    <div
      className={cn(
        "relative shrink-0",
        isSimple ? "h-[20px] w-[21px]" : "size-[41px]"
      )}
      data-name="Icon"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox={viewBox}
        fill="none"
      >
        {!isSimple && <circle cx="20.5" cy="20.5" r="20.5" fill={circleFill} />}
        <path d={pathD} fill={arrowFill} />
      </svg>
    </div>
  );
}

export default function LearnMoreLink({
  variant = "Black",
  children = "Learn more",
  className,
}: LearnMoreLinkProps) {
  const isSimple =
    variant === "SimpleGreen" ||
    variant === "SimpleWhite" ||
    variant === "SimpleBlack";

  // Determine circle fill color
  const getCircleFill = () => {
    if (isSimple) return "none";
    if (variant === "Black") return "#000000";
    if (variant === "Green" || variant === "Green2") return "#B9FF66";
    return "#FFFFFF";
  };

  // Determine arrow path fill color
  const getArrowFill = () => {
    if (
      variant === "Black" ||
      variant === "White2" ||
      variant === "SimpleGreen"
    )
      return "#B9FF66";
    if (variant === "Green2" || variant === "SimpleWhite") return "#FFFFFF";
    return "#000000";
  };

  // Determine text color
  const getTextColor = () => {
    if (
      variant === "White" ||
      variant === "White2" ||
      variant === "Green2" ||
      variant === "SimpleWhite"
    )
      return "text-white";
    if (
      variant === "Black" ||
      variant === "Black2" ||
      variant === "Green" ||
      variant === "SimpleBlack"
    )
      return "text-black";
    if (variant === "SimpleGreen") return "text-[#b9ff66]";
    return "text-black";
  };

  const circleFill = getCircleFill();
  const arrowFill = getArrowFill();
  const textColor = getTextColor();

  return (
    <div
      className={cn(
        "flex items-center relative",
        isSimple ? "gap-[14px]" : "gap-[15px]",
        className
      )}
      data-name="Link"
    >
      {!isSimple && (
        <ArrowIcon
          isSimple={isSimple}
          circleFill={circleFill}
          arrowFill={arrowFill}
        />
      )}
      <p
        className={cn(
          "font-normal leading-[28px] relative shrink-0 text-[20px]",
          textColor
        )}
      >
        {children}
      </p>
      {isSimple && (
        <ArrowIcon
          isSimple={isSimple}
          circleFill={circleFill}
          arrowFill={arrowFill}
        />
      )}
    </div>
  );
}
