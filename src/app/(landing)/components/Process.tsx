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
    title: "Set Up Your Business",
    description:
      "Add your business information, branches, staff members, services, pricing, working hours, appointment rules, and availability so the platform matches how your business operates.",
  },
  {
    number: "02",
    title: "Share Your Booking Link",
    description:
      "Give customers your unique booking link or let them start through WhatsApp, making it easy to access your services without downloading a separate application.",
  },
  {
    number: "03",
    title: "Customers Book a Time",
    description:
      "Customers select the service they need, choose an available staff member, pick a suitable date and time, and enter their details to complete the booking.",
  },
  {
    number: "04",
    title: "Manage Appointments",
    description:
      "View all bookings from the calendar, filter them by staff or date, and quickly confirm, reschedule, cancel, or update appointment details from one dashboard.",
  },
  {
    number: "05",
    title: "Send Automatic Reminders",
    description:
      "Automatically send confirmations, upcoming appointment reminders, rescheduling updates, cancellation notices, invoice messages, and payment notifications to customers.",
  },
  {
    number: "06",
    title: "Track and Improve",
    description:
      "Monitor appointments, customers, revenue, expenses, staff performance, service results, and business activity through clear reports that support better decisions.",
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
