import { cn } from "../lib/utils";

export default function Attribution({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "w-full px-[100px] pr-[99px] max-xl:px-[60px] max-sm:px-[30px] max-w-[1440px] mx-auto",
        className
      )}
    >
      <div
        className={cn(
          "bg-[#292a32] text-white flex gap-x-[20px] gap-y-[10px] max-lg:flex-wrap justify-center items-center relative",
          "px-[20px] py-[15px]",
          "[&_a]:text-[#b9ff66] [&_a]:font-medium [&_a]:decoration-solid [&_a]:decoration-[#b9ff66] [&_a]:hover:text-[#cfff7f]"
        )}
      >
        <p>
          Design by{" "}
          <a
            href="https://www.figma.com/@olgaaverchenko"
            target="_blank"
            rel="noopener noreferrer"
          >
            Olga
          </a>{" "}
          from{" "}
          <a
            href="https://www.figma.com/community/file/1230604708032389430/positivus-landing-page-design"
            target="_blank"
            rel="noopener noreferrer"
          >
            Figma Community
          </a>
        </p>
        <span className="text-white max-lg:hidden">|</span>
        <p>
          Licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY 4.0
          </a>
        </p>
        <span className="text-white max-lg:hidden">|</span>
        <p>
          Coded by{" "}
          <a
            href="https://zakariamouhid.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            zakariamouhid
          </a>
        </p>
      </div>
    </footer>
  );
}
