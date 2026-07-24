import { cn } from "@/app/(landing)/lib/utils";
import ServiceCard, {
  type CardVariant,
  type IllustrationStyle,
} from "./ServiceCard";
import type { StaticImageData } from "next/image";
import imgSEO from "@/app/(landing)/assets/illustrations/services/tokyo-magnifier-web-search-with-elements-2.png";
import imgPPC from "@/app/(landing)/assets/illustrations/services/tokyo-selecting-a-value-in-the-browser-window-1.png";
import imgSocialMedia from "@/app/(landing)/assets/illustrations/services/tokyo-browser-window-with-emoticon-likes-and-stars-around-2.png";
import imgEmail from "@/app/(landing)/assets/illustrations/services/tokyo-sending-messages-from-one-place-to-another-1.png";
import imgContent from "@/app/(landing)/assets/illustrations/services/tokyo-many-browser-windows-with-different-information-1.png";
import imgAnalytics from "@/app/(landing)/assets/illustrations/services/tokyo-volumetric-analytics-of-different-types-in-web-browsers-2.png";

type ServiceItem = {
  lines: string[];
  cardVariant: CardVariant;
  illustrationSrc: StaticImageData;
  illustrationAlt: string;
  illustrationStyle: IllustrationStyle;
};

const services: ServiceItem[] = [
  {
    lines: ["Smart", "Scheduling"],
    cardVariant: "Grey",
    illustrationSrc: imgSEO,
    illustrationAlt: "Smart Scheduling illustration",
    illustrationStyle: {
      containerHeight: 170,
      backgroundSize: { width: 148.84, height: 183.86 },
    },
  },
  {
    lines: ["WhatsApp", "Booking"],
    cardVariant: "Green",
    illustrationSrc: imgPPC,
    illustrationAlt: "WhatsApp Booking illustration",
    illustrationStyle: {
      containerHeight: 147.624,
      backgroundSize: { width: 126.73, height: 180.28 },
    },
  },
  {
    lines: ["Customer", "Management"],
    cardVariant: "DarkWhite",
    illustrationSrc: imgSocialMedia,
    illustrationAlt: "Customer Management illustration",
    illustrationStyle: {
      containerHeight: 210,
      backgroundSize: { width: 141.44, height: 141.44 },
    },
  },
  {
    lines: ["Automated", "Reminders"],
    cardVariant: "Grey",
    illustrationSrc: imgEmail,
    illustrationAlt: "Automated Reminders illustration",
    illustrationStyle: {
      containerHeight: 192.68,
      backgroundSize: { width: 140.67, height: 153.3 },
      backgroundPosition: { x: 59 - 75.7, y: 50 - 76.6 },
      transform: "scaleX(-1)",
    },
  },
  {
    lines: ["Staff", "Management"],
    cardVariant: "Green",
    illustrationSrc: imgContent,
    illustrationAlt: "Staff Management illustration",
    illustrationStyle: {
      containerHeight: 195.915,
      backgroundSize: { width: 132.08, height: 141.26 },
    },
  },
  {
    lines: ["Reports &", "Analytics"],
    cardVariant: "DarkGreen",
    illustrationSrc: imgAnalytics,
    illustrationAlt: "Reports & Analytics illustration",
    illustrationStyle: {
      containerHeight: 170,
      backgroundSize: { width: 108.36, height: 134.02 },
    },
  },
];

export default function Services({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-[40px] max-xl:gap-[30px] max-lg:grid-cols-1 items-start relative w-full max-w-[1440px] mx-auto px-[100px] max-xl:px-[60px] max-sm:px-[30px] scroll-mt-[40px]",
        className
      )}
      id="services"
    >
      {services.map((service, index) => (
        <ServiceCard key={index} {...service} />
      ))}
    </div>
  );
}
