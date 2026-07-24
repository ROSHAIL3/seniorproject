"use client";

import { useEffect, useState } from "react";

const businessTypes = [
  "Beauty Salons !",
  "Barbershops !",
  "Beauty Spas !",
  "Nail Salons !",
  "Medical Clinics !",
  "Dental Clinics !",
  "Physiotherapy Clinics !",
  "Fitness Centers !",
  "Yoga Studios !",
  "Massage Centers !",
  "Photography Studios !",
  "Pet Groomers !",
  "Auto Repair Shops !",
  "Car Washes !",
  "Cleaning Services !",
  "Home Services !",
  "Driving Schools !",
  "Consultants !",
] as const;

const TYPING_DELAY = 90;
const DELETING_DELAY = 50;
const COMPLETED_PAUSE = 1_000;
const EMPTY_PAUSE = 250;

export default function BusinessTypewriter() {
  const [businessIndex, setBusinessIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const businessType = businessTypes[businessIndex];

  useEffect(() => {
    const isComplete = characterCount === businessType.length;
    const isEmpty = characterCount === 0;
    const delay = isComplete
      ? COMPLETED_PAUSE
      : isDeleting && isEmpty
        ? EMPTY_PAUSE
        : isDeleting
          ? DELETING_DELAY
          : TYPING_DELAY;

    const timer = window.setTimeout(() => {
      if (!isDeleting && isComplete) {
        setIsDeleting(true);
        return;
      }
      if (isDeleting && isEmpty) {
        setIsDeleting(false);
        setBusinessIndex((current) => (current + 1) % businessTypes.length);
        return;
      }
      setCharacterCount((current) => current + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [businessType, characterCount, isDeleting]);

  const displayedText = businessType.slice(0, characterCount);

  return (
    <span
      className="relative block min-h-[2.08em] w-full sm:min-h-[1.04em]"
      aria-hidden="true"
    >
      <span className="invisible block sm:whitespace-nowrap">
        Physiotherapy Clinics
      </span>
      <span className="absolute inset-0 block sm:whitespace-nowrap">
        {displayedText}
        <span className="slotova-typewriter-cursor ml-[0.06em] inline-block h-[0.82em] w-[0.055em] translate-y-[0.04em] bg-current" />
      </span>
    </span>
  );
}
