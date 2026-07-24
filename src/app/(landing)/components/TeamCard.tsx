import { cn } from "@/app/(landing)/lib/utils";
import type { StaticImageData } from "next/image";

type TeamCardProps = {
  name: string;
  title: string;
  description: string;
  imageSrc: StaticImageData;
  linkedinUrl: string;
  className?: string;
};

function PersonPicture({
  imageSrc,
  className,
}: {
  imageSrc: StaticImageData;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 103 103"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      className={cn("relative", className)}
    >
      <path
        d="m88.631 53.9117c32.842 37.4096 2.5145 67.7373-34.8951 34.8951-37.4096 32.8422-67.7375 2.5145-34.8951-34.8951-32.8424-37.4096-2.5145-67.7375 34.8951-34.8951 37.4096-32.8424 67.7371-2.5145 34.8951 34.8951z"
        fill="#231F20"
      />
      <mask
        id="mask_team_person_image"
        style={{ maskType: "alpha" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="98"
        height="98"
      >
        <path
          d="M83.8068 48.9117C116.649 86.3213 86.3213 116.649 48.9117 83.8068C11.5021 116.649 -18.8258 86.3213 14.0166 48.9117C-18.8258 11.5021 11.5021 -18.8258 48.9117 14.0166C86.3213 -18.8258 116.649 11.5021 83.8068 48.9117Z"
          fill="#231F20"
        />
      </mask>
      <g mask="url(#mask_team_person_image)">
        <image
          width="98"
          height="98"
          preserveAspectRatio="none"
          xlinkHref={imageSrc.src}
        />
        <rect
          width="98"
          height="98"
          fill="#B9FF66"
          style={{ mixBlendMode: "multiply" }}
        />
      </g>
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block size-full"
      aria-hidden="true"
    >
      <circle cx="17" cy="17" r="17" fill="black" />
      <path d="M9.31776 25H12.8131V13.6844H9.31776V25Z" fill="#B9FF66" />
      <path
        d="M9 10.0719C9 11.1875 9.90031 12.0906 11.0654 12.0906C12.1776 12.0906 13.0779 11.1875 13.0779 10.0719C13.0779 8.95625 12.1776 8 11.0654 8C9.90031 8 9 8.95625 9 10.0719Z"
        fill="#B9FF66"
      />
      <path
        d="M22.4517 25H26V18.7844C26 15.7562 25.3115 13.3656 21.7632 13.3656C20.0685 13.3656 18.9034 14.3219 18.4268 15.225H18.3738V13.6844H15.0374V25H18.5327V19.4219C18.5327 17.9344 18.7975 16.5 20.6511 16.5C22.4517 16.5 22.4517 18.2 22.4517 19.475V25Z"
        fill="#B9FF66"
      />
    </svg>
  );
}

export default function TeamCard({
  name,
  title,
  description,
  imageSrc,
  linkedinUrl,
  className,
}: TeamCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-[#191a23] border-solid",
        "grid grid-rows-[auto_auto_minmax(0,1fr)] items-start overflow-clip",
        "px-[34px] py-[39px] max-xl:p-[25px]",
        "relative rounded-[45px] shadow-[0px_5px_0px_0px_#191a23]",
        "min-h-[390px] shrink-0 gap-[28px] max-md:min-h-0 max-md:gap-[20px] w-full",
        className
      )}
      data-name="Card"
    >
      <div
        className="grid grid-rows-[auto_auto] grid-cols-[min-content_minmax(0,1fr)] gap-x-[20px] relative shrink-0 w-full min-h-px min-w-px mr-[-34px]"
        data-name="Person"
      >
        <PersonPicture
          imageSrc={imageSrc}
          className="row-span-2 self-end size-[103px] max-xl:size-[80px] max-sm:size-[60px]"
        />
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name}'s LinkedIn profile`}
          title={`${name} on LinkedIn`}
          className="-mb-[2px] size-[40px] shrink-0 self-start justify-self-end rounded-full transition duration-150 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191a23] focus-visible:ring-offset-2 max-sm:size-[36px]"
          data-name="Social icon"
        >
          <SocialIcon />
        </a>
        <div className="leading-[normal] text-black self-end" data-name="Name">
          <p className="font-medium text-[20px]" data-node-id="name">
            {name}
          </p>
          <p className="font-normal text-[18px]" data-node-id="title">
            {title}
          </p>
        </div>
      </div>
      <div className="h-0 relative shrink-0 w-full" data-name="Divider">
        <div className="absolute inset-[-1px_0_0_0] border-t border-[#191a23]"></div>
      </div>
      <p
        className="relative shrink-0 max-w-[440px] whitespace-pre-wrap text-[18px] font-normal leading-[1.45] text-black max-xl:max-w-none"
        data-name="Description"
      >
        {description}
      </p>
    </div>
  );
}
