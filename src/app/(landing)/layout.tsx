import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./landing.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Positivus - Digital Marketing Agency",
  description:
    "A modern digital marketing agency landing page. Built with Next.js, TypeScript, and Tailwind CSS. Design by Olga (@olgaaverchenko) from Figma Community.",
  keywords: ["digital marketing", "SEO", "PPC", "social media marketing"],
  authors: [
    { name: "zakariamouhid", url: "https://zakariamouhid.blogspot.com/" },
  ],
  openGraph: {
    title: "Positivus - Digital Marketing Agency",
    description: "A modern digital marketing agency landing page",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Positivus - Digital Marketing Agency",
    description: "A modern digital marketing agency landing page",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${spaceGrotesk.variable} positivus-landing`}>
      {children}
    </div>
  );
}
