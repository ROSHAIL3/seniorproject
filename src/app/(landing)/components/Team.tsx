import { cn } from "@/app/(landing)/lib/utils";
import TeamCard from "./TeamCard";
import type { StaticImageData } from "next/image";
import roshailImage from "@/app/(landing)/assets/team/roshail-tavnir.png";
import abdullaImage from "@/app/(landing)/assets/team/abdullah-aldoseri.png";

type TeamMember = {
  name: string;
  title: string;
  description: string;
  imageSrc: StaticImageData;
  linkedinUrl: string;
};

const teamMembers: TeamMember[] = [
  {
    name: "Roshail Tavnir",
    title: "Full Stack Developer",
    description:
      "Responsible for designing, developing, and implementing Slotova, including the user interface, backend, database, and booking management features.",
    imageSrc: roshailImage,
    linkedinUrl: "https://www.linkedin.com/in/roshailtanvir/",
  },
  {
    name: "Dr. Abdulla Aldoseri",
    title: "Project Supervisor",
    description:
      "Providing academic guidance, technical feedback, and project oversight throughout the planning, development, and evaluation of the project.",
    imageSrc: abdullaImage,
    linkedinUrl:
      "https://bh.linkedin.com/in/dr-abdullah-aldoseri-0ab6706a",
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
          "relative mx-auto grid w-full max-w-[1040px] grid-cols-2 gap-[40px] max-xl:gap-[30px] max-md:max-w-[620px] max-md:grid-cols-1 max-sm:gap-[20px]",
          className
        )}
        data-name="Group of cards"
      >
        {teamMembers.map((member) => (
          <TeamCard key={member.name} {...member} />
        ))}
      </div>
    </div>
  );
}
