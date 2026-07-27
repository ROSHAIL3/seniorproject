"use client";

import { useEffect, useRef } from "react";

const INITIAL_PROGRESS = 0.08;
const INTERPOLATION = 0.14;

export default function ScrollProgressLine() {
  const lineRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let currentProgress = INITIAL_PROGRESS;
    let targetProgress = INITIAL_PROGRESS;
    let animationFrame = 0;

    const calculateProgress = () => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pageProgress =
        scrollableHeight > 0
          ? Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1)
          : 0;
      return INITIAL_PROGRESS + pageProgress * (1 - INITIAL_PROGRESS);
    };

    const render = (progress: number) => {
      line.style.transform = `scaleX(${progress})`;
    };

    const animate = () => {
      currentProgress +=
        (targetProgress - currentProgress) * INTERPOLATION;

      if (Math.abs(targetProgress - currentProgress) < 0.001) {
        currentProgress = targetProgress;
        render(currentProgress);
        animationFrame = 0;
        return;
      }

      render(currentProgress);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const update = () => {
      targetProgress = calculateProgress();

      if (reducedMotion.matches) {
        currentProgress = targetProgress;
        render(currentProgress);
        return;
      }

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    render(INITIAL_PROGRESS);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    reducedMotion.addEventListener("change", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      reducedMotion.removeEventListener("change", update);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <svg
      ref={lineRef}
      aria-hidden="true"
      viewBox="0 0 1440 4"
      preserveAspectRatio="none"
      className="slotova-scroll-progress pointer-events-none fixed inset-x-0 top-0 z-[100000] h-[4px] w-full max-sm:h-[3px]"
    >
      <path
        d="M0 2 H1440"
        fill="none"
        stroke="#191a23"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
