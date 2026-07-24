import { cn } from "@/app/(landing)/lib/utils";
import LearnMoreLink from "./LearnMoreLink";
import Heading, { type HeadingVariant } from "./Heading";
import type { StaticImageData } from "next/image";
import Image from "next/image";

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

export type CardVariant = "Grey" | "Green" | "DarkWhite" | "DarkGreen";

export type IllustrationStyle = {
  containerHeight: number;
  backgroundSize: { width: number; height: number };
  backgroundPosition?: { x: number; y: number };
  transform?: string;
};

type ServiceCardProps = {
  lines: string[];
  cardVariant: CardVariant;
  illustrationSrc: StaticImageData;
  illustrationAlt: string;
  illustrationStyle: IllustrationStyle;
  className?: string;
};

export default function ServiceCard({
  lines,
  cardVariant,
  illustrationSrc,
  illustrationAlt,
  illustrationStyle,
  className,
}: ServiceCardProps) {
  // Determine card styling based on variant
  const getCardStyles = (): {
    backgroundColor: string;
    headingVariant: HeadingVariant;
    linkVariant: LearnMoreLinkVariant;
  } => {
    switch (cardVariant) {
      case "Grey":
        return {
          backgroundColor: "#f3f3f3",
          headingVariant: "Green",
          linkVariant: "Black",
        };
      case "Green":
        return {
          backgroundColor: "#b9ff66",
          headingVariant: "White",
          linkVariant: "Black",
        };
      case "DarkWhite":
        return {
          backgroundColor: "#191a23",
          headingVariant: "White",
          linkVariant: "White",
        };
      case "DarkGreen":
        return {
          backgroundColor: "#191a23",
          headingVariant: "Green",
          linkVariant: "White",
        };
    }
  };

  const { backgroundColor, headingVariant, linkVariant } = getCardStyles();

  return (
    <div
      className={cn(
        "border border-[#191a23] border-solid flex items-center justify-between gap-[10px] overflow-clip p-[49px] max-xl:p-[35px] relative rounded-[45px] shadow-[0px_5px_0px_0px_#191a23] shrink-0 w-full",
        className
      )}
      style={{ backgroundColor }}
      data-name="Card"
    >
      <div
        className="flex flex-col gap-[93px] max-xl:gap-[60px] items-start justify-center relative shrink-0"
        data-name="Heading and link"
      >
        <Heading
          lines={lines}
          variant={headingVariant}
          headingClassName="text-[30px]/[1.27] max-xl:text-[25px]/[1.27]"
          as="h3"
        />
        <LearnMoreLink variant={linkVariant}>Explore feature</LearnMoreLink>
      </div>
      <div
        className="relative shrink-0 overflow-hidden flex-1 h-auto max-w-[210px]"
        data-name="Illustration"
        style={{
          aspectRatio: `210 / ${illustrationStyle.containerHeight}`,
        }}
      >
        <Image
          src={illustrationSrc}
          alt={illustrationAlt}
          className="absolute max-w-none max-h-none"
          style={{
            width: illustrationStyle.backgroundSize.width + "%",
            height: illustrationStyle.backgroundSize.height + "%",
            left:
              (illustrationStyle.backgroundPosition?.x ??
                50 - illustrationStyle.backgroundSize.width / 2) + "%",
            top:
              (illustrationStyle.backgroundPosition?.y ??
                50 - illustrationStyle.backgroundSize.height / 2) + "%",
            transform: illustrationStyle.transform,
          }}
        />
      </div>
    </div>
  );
}
