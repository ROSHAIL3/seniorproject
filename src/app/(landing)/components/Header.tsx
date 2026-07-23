import Image from "next/image";
import { cn } from "../lib/utils";
import Button from "./Button";

export default function Header({ className }: { className?: string }) {
  return (
    <main
      className={cn(
        "flex items-center max-md:flex-col justify-between gap-[20px] px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
    >
      <div className="flex flex-col gap-[35px] max-xl:gap-[25px] items-start relative shrink-0 flex-1 pb-[34px] max-md:pb-0 max-w-[531px] max-md:max-w-none">
        <h1 className="font-medium relative shrink-0 text-[60px]/[normal] max-xl:text-[48px]/[1] whitespace-pre-wrap">
          Navigating the digital landscape for success
        </h1>
        <HeroGraphic className="hidden max-md:flex mx-auto max-w-[480px] -my-[10px]" />
        <p className="font-normal relative shrink-0 text-[20px]/[28px] max-xl:text-[16px]/[24px] max-w-[498px] max-md:max-w-none whitespace-pre-wrap">
          Our digital marketing agency helps businesses grow and succeed online
          through a range of services including SEO, PPC, social media
          marketing, and content creation.
        </p>
        <Button
          variant="primary"
          className="py-[19px] pr-[36px] max-md:w-full justify-center"
        >
          Book a consultation
        </Button>
      </div>
      <HeroGraphic className="max-md:hidden ml-auto flex-1" priority />
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
