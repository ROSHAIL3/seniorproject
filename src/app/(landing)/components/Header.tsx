import Image from "next/image";
import { cn } from "../lib/utils";
import Button from "./Button";
import BusinessTypewriter from "./BusinessTypewriter";

export default function Header({ className }: { className?: string }) {
  return (
    <main
      className={cn(
        "relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-x-[72px] gap-y-[48px] px-[100px] max-xl:gap-x-[48px] max-xl:px-[60px] max-md:gap-y-[40px] max-sm:px-[24px] lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]",
        className
      )}
    >
      <div className="relative flex min-w-0 max-w-[650px] flex-col items-start">
        <h1
          className="relative text-[clamp(42px,4.45vw,64px)] font-medium leading-[1.04] tracking-[-0.035em] max-sm:text-[40px]"
          aria-label="Manage every booking in one simple place for businesses across every industry"
        >
          <span className="block">Manage every</span>
          <span className="block">booking in one</span>
          <span className="block">simple place for</span>
          <BusinessTypewriter />
        </h1>
        <p className="relative mt-[28px] max-w-[590px] text-[19px] font-normal leading-[1.55] max-xl:mt-[24px] max-xl:text-[17px] max-sm:text-[16px]">
          Slotova helps businesses across every industry manage appointments,
          customers, staff, schedules, reminders, and daily operations through
          one flexible and easy-to-use platform.
        </p>
        <Button
          variant="primary"
          className="mt-[32px] min-h-[58px] justify-center px-[34px] py-[16px] max-xl:mt-[28px] max-sm:w-full"
        >
          Book a consultation
        </Button>
      </div>
      <HeroGraphic className="mx-auto max-w-[520px] lg:mr-0" priority />
    </main>
  );
}

function HeroGraphic({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "slotova-hero-art relative flex aspect-square w-full max-w-[535px] shrink-0 items-center justify-center",
        className,
      )}
      aria-label="Slotova"
      role="img"
    >
      <div className="slotova-hero-halo absolute inset-[9%] rounded-full" />
      <div className="slotova-hero-orbit absolute inset-[5%] rounded-full">
        <span className="slotova-hero-orbit-dot absolute left-[8%] top-[14%]" />
        <span className="slotova-hero-orbit-dot slotova-hero-orbit-dot-small absolute bottom-[9%] right-[13%]" />
      </div>
      <span className="slotova-hero-spark slotova-hero-spark-one absolute right-[6%] top-[21%]" />
      <span className="slotova-hero-spark slotova-hero-spark-two absolute bottom-[19%] left-[4%]" />
      <div className="slotova-hero-logo relative z-10 w-[82%] overflow-hidden rounded-[28px]">
        <Image
          src="/images/logo/sp-hero-logo.svg"
          alt=""
          aria-hidden="true"
          width={1500}
          height={1500}
          priority={priority}
          className="block h-auto w-full object-contain"
        />
      </div>
      <div className="slotova-hero-pill absolute bottom-[8%] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-black/10 bg-white/90 px-4 py-2 text-[12px] font-medium tracking-[0.08em] shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        PLAN&nbsp;&nbsp;•&nbsp;&nbsp;BOOK&nbsp;&nbsp;•&nbsp;&nbsp;GROW
      </div>
    </div>
  );
}
