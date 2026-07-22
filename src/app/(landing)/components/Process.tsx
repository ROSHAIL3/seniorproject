"use client";

import { useState } from "react";
import { cn } from "@/app/(landing)/lib/utils";
import ProcessCard from "./ProcessCard";

type ProcessItem = {
  number: string;
  title: string;
  description: string;
};

const processItems: ProcessItem[] = [
  {
    number: "01",
    title: "Consultation",
    description:
      "During the initial consultation, we will discuss your business goals and objectives, target audience, and current marketing efforts. This will allow us to understand your needs and tailor our services to best fit your requirements.",
  },
  {
    number: "02",
    title: "Research and Strategy Development",
    description:
      "We conduct thorough research on your industry, competitors, and target market to develop a comprehensive strategy that aligns with your business objectives and maximizes your marketing ROI.",
  },
  {
    number: "03",
    title: "Implementation",
    description:
      "Our team executes the developed strategy, implementing all marketing initiatives across various channels while ensuring consistency and quality in every aspect of the campaign.",
  },
  {
    number: "04",
    title: "Monitoring and Optimization",
    description:
      "We continuously monitor campaign performance, analyze data, and make data-driven optimizations to improve results and ensure your marketing efforts are delivering the best possible outcomes.",
  },
  {
    number: "05",
    title: "Reporting and Communication",
    description:
      "Regular reporting and transparent communication keep you informed about campaign progress, key metrics, and insights, ensuring you're always aware of how your marketing investments are performing.",
  },
  {
    number: "06",
    title: "Continual Improvement",
    description:
      "We believe in continuous improvement, regularly reviewing and refining our strategies based on performance data and market changes to ensure long-term success and growth for your business.",
  },
];

export default function Process({ className }: { className?: string }) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? -1 : index);
  };

  return (
    <div
      className={cn(
        "content-stretch flex flex-col gap-[30px] items-start px-[100px] max-xl:px-[60px] max-sm:px-[30px] py-0 relative w-full max-w-[1440px] mx-auto",
        className
      )}
      data-name="Process block"
    >
      {processItems.map((item, index) => (
        <ProcessCard
          key={index}
          number={item.number}
          title={item.title}
          description={item.description}
          isExpanded={expandedIndex === index}
          onToggle={() => handleToggle(index)}
          className="mx-[3px]"
        />
      ))}
    </div>
  );
}
