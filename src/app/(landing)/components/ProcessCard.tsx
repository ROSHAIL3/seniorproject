"use client";

import { cn } from "@/app/(landing)/lib/utils";
import PlusIcon from "./PlusIcon";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

type ProcessCardProps = {
  number: string;
  title: string;
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
};

export default function ProcessCard({
  number,
  title,
  description,
  isExpanded,
  onToggle,
  className,
}: ProcessCardProps) {
  const [autoHeight, setAutoHeight] = useState<number>(2000);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const updateAutoHeight = useCallback(() => {
    if (descriptionRef.current) {
      setAutoHeight(descriptionRef.current.clientHeight);
    }
  }, []);

  useLayoutEffect(() => {
    if (!descriptionRef.current) return;
    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        updateAutoHeight();
      }
    });
    let firstResize = false;
    const resizeObserver = new ResizeObserver(() => {
      if (!firstResize) {
        firstResize = true;
        return;
      }
      updateAutoHeight();
    });
    intersectionObserver.observe(descriptionRef.current);
    resizeObserver.observe(descriptionRef.current);
    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [description, isExpanded, updateAutoHeight]);

  return (
    <div
      className={cn(
        "border border-[#191a23] border-solid transition-colors duration-300 flex flex-col items-start overflow-clip px-[59px] max-xl:px-[40px] max-sm:px-[30px] py-[40px] max-xl:py-[30px] max-sm:py-[20px] relative rounded-[45px] shadow-[0px_5px_0px_0px_#191a23] shrink-0 w-full max-w-[1234px] cursor-pointer",
        isExpanded ? "bg-[#b9ff66]" : "bg-[#f3f3f3]",
        className
      )}
      data-name="Card"
      onClick={onToggle}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div
        className="content-stretch flex items-center justify-between relative shrink-0 w-full gap-[10px]"
        data-name="Content"
      >
        <div
          className="content-stretch flex font-medium gap-[25px] items-center leading-[normal] relative flex-1 text-black"
          data-name="Label"
        >
          <p className="relative shrink-0 text-[60px] max-xl:text-[50px] max-sm:text-[30px] font-medium">
            {number}
          </p>
          <p className="relative flex-1 text-[30px] max-xl:text-[25px] max-sm:text-[20px] font-medium whitespace-pre-wrap">
            {title}
          </p>
        </div>
        <PlusIcon
          isExpanded={isExpanded}
          className="relative shrink-0 size-[58px] -mr-[3px]"
        />
      </div>
      {description && (
        <div
          className={cn(
            "transition-all duration-300 overflow-hidden",
            isExpanded ? `max-h-(--auto-height)` : "max-h-0 opacity-0 invisible"
          )}
          style={
            {
              "--auto-height": autoHeight + "px",
            } as React.CSSProperties
          }
        >
          <div ref={descriptionRef} className="overflow-hidden">
            <div
              className="h-px relative shrink-0 w-full mt-[30px] mb-[29px] max-xl:my-[20px] max-sm:my-[15px]"
              data-name="Divider"
              aria-hidden="true"
            >
              <div className="absolute inset-[-1px_0_0_0] border-t border-[#191a23]"></div>
            </div>
            <p className="font-normal h-auto leading-[normal] relative shrink-0 text-[18px] text-black w-full whitespace-pre-wrap pb-[14px] max-xl:pb-[10px] max-sm:pb-[5px]">
              {description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
