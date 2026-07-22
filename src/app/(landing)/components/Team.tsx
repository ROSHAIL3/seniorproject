import { cn } from "@/app/(landing)/lib/utils";
import TeamCard from "./TeamCard";
import type { StaticImageData } from "next/image";
import personImage1 from "@/app/(landing)/assets/team/person-1.jpg";
import personImage2 from "@/app/(landing)/assets/team/person-2.jpg";
import personImage3 from "@/app/(landing)/assets/team/person-3.jpg";

type TeamMember = {
  name: string;
  title: string;
  description: string;
  imageSrc: StaticImageData;
};

const teamMembers: TeamMember[] = [
  {
    name: "John Smith",
    title: "CEO and Founder",
    description:
      "10+ years of experience in digital marketing. Expertise in SEO, PPC, and content strategy",
    imageSrc: personImage1,
  },
  {
    name: "Jane Doe",
    title: "Director of Operations",
    description:
      "7+ years of experience in project management and team leadership. Strong organizational and communication skills",
    imageSrc: personImage3,
  },
  {
    name: "Michael Brown",
    title: "Senior SEO Specialist",
    description:
      "5+ years of experience in SEO and content creation. Proficient in keyword research and on-page optimization",
    imageSrc: personImage2,
  },
  {
    name: "Emily Johnson",
    title: "PPC Manager",
    description:
      "3+ years of experience in paid search advertising. Skilled in campaign management and performance analysis",
    imageSrc: personImage2,
  },
  {
    name: "Brian Williams",
    title: "Social Media Specialist",
    description:
      "4+ years of experience in social media marketing. Proficient in creating and scheduling content, analyzing metrics, and building engagement",
    imageSrc: personImage3,
  },
  {
    name: "Sarah Kim",
    title: "Content Creator",
    description:
      "2+ years of experience in writing and editing.\nSkilled in creating compelling, SEO-optimized content for various industries",
    imageSrc: personImage1,
  },
];

export default function Team({ className }: { className?: string }) {
  return (
    <div
      className="max-w-[1440px] mx-auto px-[100px] max-xl:px-[60px] max-sm:px-[30px] scroll-mt-[40px]"
      id="team"
    >
      <div
        className={cn(
          "grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-[40px] max-xl:gap-[30px] max-sm:gap-[20px] relative",
          className
        )}
        data-name="Group of cards"
      >
        {teamMembers.map((member, index) => (
          <TeamCard key={index} {...member} />
        ))}
      </div>
    </div>
  );
}
