import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./landing.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Slotova",
  description:
    "Manage appointments, customers, staff, services, branches, invoices, expenses, and reports with Slotova.",
  keywords: ["booking", "appointments", "beauty", "wellness", "business management"],
  openGraph: {
    title: "Slotova",
    description: "Booking and business management for beauty and wellness organizations.",
    type: "website",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${spaceGrotesk.variable} slotova-landing`}>
      {children}
    </div>
  );
}
