import { cn } from "../lib/utils";
import AmazonLogo from "@/app/(landing)/assets/icons/companies/amazon.svg";
import DribbbleLogo from "@/app/(landing)/assets/icons/companies/dribbble.svg";
import HubSpotLogo from "@/app/(landing)/assets/icons/companies/hubspot.svg";
import NotionLogo from "@/app/(landing)/assets/icons/companies/notion.svg";
import NetflixLogo from "@/app/(landing)/assets/icons/companies/netflix.svg";
import ZoomLogo from "@/app/(landing)/assets/icons/companies/zoom.svg";

type LogoItem = {
  Logo: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  width: string;
};

const logos: LogoItem[] = [
  {
    Logo: AmazonLogo,
    width: "w-[124.113px]",
  },
  {
    Logo: DribbbleLogo,
    width: "w-[126.369px]",
  },
  {
    Logo: HubSpotLogo,
    width: "w-[128.626px]",
  },
  {
    Logo: NotionLogo,
    width: "w-[145.551px]",
  },
  {
    Logo: NetflixLogo,
    width: "w-[125.241px]",
  },
  {
    Logo: ZoomLogo,
    width: "w-[110.573px]",
  },
];

export default function Logotypes({ className }: { className?: string }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-start justify-between px-[100px] max-xl:px-[60px] max-sm:px-[40px] max-xl:gap-[35px] overflow-x-auto [scrollbar-width:none] py-0 w-full max-w-[1440px] mx-auto",
          className
        )}
      >
        {logos.map(({ Logo, width }, index) => (
          <div
            key={index}
            className={cn(
              "h-[48px] grayscale overflow-clip relative shrink-0 flex items-center justify-center",
              width
            )}
          >
            <Logo className="block max-w-none size-full" />
          </div>
        ))}
      </div>
      <div className="absolute left-0 top-0 h-full w-[60px] max-sm:w-[30px] bg-linear-to-r from-white to-transparent"></div>
      <div className="absolute right-0 top-0 h-full w-[60px] max-sm:w-[30px] bg-linear-to-l from-white to-transparent"></div>
    </div>
  );
}
