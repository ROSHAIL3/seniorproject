import { cn } from "../lib/utils";
import Link from "next/link";
import SubscriptionForm from "./SubscriptionForm";
import Logo from "./Logo";

const navLinks = [
  { href: ".", label: "About us" },
  { href: ".", label: "Services" },
  { href: ".", label: "Use Cases" },
  { href: ".", label: "Pricing" },
  { href: ".", label: "Blog" },
];

export default function Footer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-start px-[100px] pr-[99px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
    >
      <div
        className={cn(
          "bg-[#191a23] flex flex-col items-start relative rounded-tl-[45px] rounded-tr-[45px] shrink-0 w-full",
          "gap-[50px] max-lg:gap-[40px] max-md:gap-[30px]",
          "px-[60px] max-lg:px-[40px] max-md:px-[30px]",
          "pb-[50px] pt-[55px] max-lg:pb-[40px] max-lg:pt-[40px] max-md:pb-[30px] max-md:pt-[40px]"
        )}
      >
        <div className="flex flex-col gap-[66px] max-lg:gap-[40px] items-start relative w-full">
          {/* Top section: Logo, Navigation, Social Icons */}
          <div className="flex justify-between items-center relative w-full gap-[20px] max-lg:flex-wrap">
            {/* Logo with white fill */}
            <Logo inverted size="md" className="text-white" />

            {/* Navigation Links */}
            <div className="flex font-normal gap-[40.5px] max-xl:gap-[20px] items-start leading-[normal] relative shrink-0 text-[18px] text-white underline max-lg:w-full max-lg:order-1 flex-wrap">
              {navLinks.map(({ href, label }, index) => (
                <Link
                  key={index}
                  href={href}
                  className="[text-decoration-skip-ink:none] [text-underline-position:from-font] underline-offset-1 decoration-solid relative shrink-0"
                >
                  {label}
                </Link>
              ))}
            </div>

          </div>

          {/* Middle section: Contact Info and Subscription */}
          <div className="flex gap-[30px] items-center justify-between relative shrink-0 w-full max-md:flex-col max-md:items-start">
            {/* Contact Information */}
            <div className="flex flex-col gap-[27px] items-start relative flex-2 max-lg:flex-3">
              <div className="flex flex-col items-start relative">
                <div className="bg-[#b9ff66] flex flex-col items-start px-[7px] py-0 relative rounded-[7px]">
                  <p className="font-medium leading-[normal] relative shrink-0 text-[20px] text-black">
                    Contact us:
                  </p>
                </div>
              </div>
              <div className="flex flex-col font-normal gap-[20px] items-start relative text-[18px] text-white">
                <p className="leading-[normal] relative">
                  Slotova business management platform
                </p>
                <p className="leading-[normal] relative">Bahrain</p>
              </div>
            </div>

            {/* Subscription Form */}
            <SubscriptionForm />
          </div>
        </div>

        {/* Divider */}
        <div className="h-0 relative shrink-0 w-full border-t xl:-mt-px border-white"></div>

        {/* Bottom section: Line and Copyright */}
        <div className="flex font-normal gap-x-[41px] gap-y-[10px] items-start relative text-[18px]/[28px] text-white w-full flex-wrap">
          <p className="relative">© {new Date().getFullYear()} Slotova. All Rights Reserved.</p>
          <Link
            href="."
            className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-solid relative underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
