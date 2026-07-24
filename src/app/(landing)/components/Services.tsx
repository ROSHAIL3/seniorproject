import { cn } from "@/app/(landing)/lib/utils";
import ServiceCard, {
  type CardVariant,
  type IllustrationStyle,
} from "./ServiceCard";
import type { ComponentType, SVGProps } from "react";
import automatedRemindersImage from "@/app/(landing)/assets/illustrations/services/features pictures/Automated Reminders.svg";
import customerManagementImage from "@/app/(landing)/assets/illustrations/services/features pictures/Customer Management.svg";
import reportsAnalyticsImage from "@/app/(landing)/assets/illustrations/services/features pictures/Reports & Analytics.svg";
import smartSchedulingImage from "@/app/(landing)/assets/illustrations/services/features pictures/Smart Scheduling.svg";
import staffManagementImage from "@/app/(landing)/assets/illustrations/services/features pictures/Staff Management.svg";
import whatsAppBookingImage from "@/app/(landing)/assets/illustrations/services/features pictures/WhatsApp Booking.svg";

type ServiceItem = {
  lines: string[];
  cardVariant: CardVariant;
  illustrationSrc: FeatureIllustration;
  illustrationStyle: IllustrationStyle;
};

type FeatureIllustration = ComponentType<SVGProps<SVGSVGElement>>;

const featureImages = {
  "Smart Scheduling": smartSchedulingImage as unknown as FeatureIllustration,
  "WhatsApp Booking": whatsAppBookingImage as unknown as FeatureIllustration,
  "Customer Management":
    customerManagementImage as unknown as FeatureIllustration,
  "Automated Reminders":
    automatedRemindersImage as unknown as FeatureIllustration,
  "Staff Management": staffManagementImage as unknown as FeatureIllustration,
  "Reports & Analytics":
    reportsAnalyticsImage as unknown as FeatureIllustration,
} satisfies Record<string, FeatureIllustration>;

const services: ServiceItem[] = [
  {
    lines: ["Smart", "Scheduling"],
    cardVariant: "Grey",
    illustrationSrc: featureImages["Smart Scheduling"],
    illustrationStyle: {
      containerHeight: 170,
      backgroundSize: { width: 148.84, height: 183.86 },
    },
  },
  {
    lines: ["WhatsApp", "Booking"],
    cardVariant: "Green",
    illustrationSrc: featureImages["WhatsApp Booking"],
    illustrationStyle: {
      containerHeight: 147.624,
      backgroundSize: { width: 126.73, height: 180.28 },
    },
  },
  {
    lines: ["Customer", "Management"],
    cardVariant: "DarkWhite",
    illustrationSrc: featureImages["Customer Management"],
    illustrationStyle: {
      containerHeight: 210,
      backgroundSize: { width: 141.44, height: 141.44 },
    },
  },
  {
    lines: ["Automated", "Reminders"],
    cardVariant: "Grey",
    illustrationSrc: featureImages["Automated Reminders"],
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
    illustrationSrc: featureImages["Staff Management"],
    illustrationStyle: {
      containerHeight: 195.915,
      backgroundSize: { width: 132.08, height: 141.26 },
    },
  },
  {
    lines: ["Reports &", "Analytics"],
    cardVariant: "DarkGreen",
    illustrationSrc: featureImages["Reports & Analytics"],
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
      {services.map((service) => {
        const title = service.lines.join(" ");

        return (
          <ServiceCard
            key={title}
            {...service}
            illustrationAlt={`${title} illustration`}
          />
        );
      })}
    </div>
  );
}
