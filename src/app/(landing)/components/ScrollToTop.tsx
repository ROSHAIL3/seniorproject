"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY >= 400);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 z-40 flex size-[54px] items-center justify-center rounded-[14px] border border-[#191a23] bg-[#b9ff66] text-[#191a23] shadow-[0_5px_0_#191a23] transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_7px_0_#191a23] active:scale-95 active:translate-y-[2px] active:shadow-[0_3px_0_#191a23] max-sm:bottom-5 max-sm:right-5 max-sm:size-[48px] dark:border-[#b9ff66] dark:bg-[#191a23] dark:text-[#b9ff66] dark:shadow-[0_5px_0_#b9ff66] dark:hover:shadow-[0_7px_0_#b9ff66] dark:active:shadow-[0_3px_0_#b9ff66] ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 max-sm:size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 15 6-6 6 6" />
      </svg>
    </button>
  );
}
