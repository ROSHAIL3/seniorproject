import { cn } from "@/app/(landing)/lib/utils";

type HeadingSubheadingProps = {
  heading: string | React.ReactNode;
  subheading: string;
  className?: string;
  subheadingClassName?: string;
};

export default function HeadingSubheading({
  heading,
  subheading,
  className,
  subheadingClassName,
}: HeadingSubheadingProps) {
  return (
    <div
      className={cn(
        "flex max-sm:flex-col gap-[40px] max-lg:gap-[30px] max-sm:gap-[20px] items-start px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
    >
      <div className="flex flex-col items-start relative shrink-0">
        <div className="bg-[#b9ff66] flex flex-col items-start px-[7px] py-0 relative rounded-[7px] shrink-0">
          <h2 className="font-medium relative shrink-0 text-[40px]/[normal] max-sm:text-[30px]/[normal] text-black">
            {heading}
          </h2>
        </div>
      </div>
      <p
        className={cn(
          "font-normal text-lg/[normal] relative shrink-0 flex-1 text-black max-w-[580px] whitespace-pre-wrap",
          subheadingClassName
        )}
      >
        {subheading}
      </p>
    </div>
  );
}
