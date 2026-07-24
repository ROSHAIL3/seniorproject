import { cn } from "@/app/(landing)/lib/utils";
import ServiceCard, { type CardVariant } from "./ServiceCard";
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
  },
  {
    lines: ["WhatsApp", "Booking"],
    cardVariant: "Green",
    illustrationSrc: featureImages["WhatsApp Booking"],
  },
  {
    lines: ["Customer", "Management"],
    cardVariant: "DarkWhite",
    illustrationSrc: featureImages["Customer Management"],
  },
  {
    lines: ["Automated", "Reminders"],
    cardVariant: "Grey",
    illustrationSrc: featureImages["Automated Reminders"],
  },
  {
    lines: ["Staff", "Management"],
    cardVariant: "Green",
    illustrationSrc: featureImages["Staff Management"],
  },
  {
    lines: ["Reports &", "Analytics"],
    cardVariant: "DarkGreen",
    illustrationSrc: featureImages["Reports & Analytics"],
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
