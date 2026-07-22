import { cn } from "@/app/(landing)/lib/utils";
import Button from "./Button";
import CtaIllustration from "@/app/(landing)/assets/illustrations/cta.svg";

type CTAProps = {
  className?: string;
};

export default function CTA({ className }: CTAProps) {
  return (
    <div
      className={cn(
        "flex items-center px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
    >
      <div className="bg-[#f3f3f3] flex items-center justify-between px-[60px] max-xl:px-[40px] max-sm:px-[30px] py-0 gap-[10px] relative rounded-[45px] shrink-0 w-full my-[23px]">
        <div className="flex flex-col gap-[26px] items-start relative shrink-0 flex-3 max-lg:flex-4 py-[40px] max-sm:py-[30px]">
          <h3 className="font-medium leading-[normal] relative shrink-0 text-[30px] text-black max-w-[500px] whitespace-pre-wrap">
            Let&apos;s make things happen
          </h3>
          <svg
            viewBox="0 0 359 394"
            className="hidden max-md:block mx-auto max-w-[300px] -my-[24px]"
          >
            <use href="#cta-illustration" />
          </svg>
          <p className="font-normal relative shrink-0 text-[18px]/[normal] text-black max-w-[500px] whitespace-pre-wrap">
            Contact us today to learn more about how our digital marketing
            services can help your business grow and succeed online.
          </p>
          <Button
            variant="primary"
            className="py-[19px] mb-[2px] max-sm:w-full justify-center"
          >
            Get your free proposal
          </Button>
        </div>
        <div className="flex-2 w-full max-w-[494px] flex items-center justify-center shrink-0 relative pr-[40px] -my-[24px] max-md:hidden">
          <CtaIllustration
            id="cta-illustration"
            className="block h-auto w-full max-w-[359px]"
            width={359}
            height={394}
          />
        </div>
      </div>
    </div>
  );
}
