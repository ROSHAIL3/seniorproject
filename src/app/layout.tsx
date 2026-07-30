import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  applicationName: "Slotova",
  title: {
    default: "Slotova",
    template: "%s | Slotova",
  },
  description:
    "Booking and business management for beauty and wellness organizations.",
  icons: {
    icon: "/images/logo/slotova-mark.svg",
  },
  openGraph: {
    title: "Slotova",
    description:
      "Booking and business management for beauty and wellness organizations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${outfit.className} ${outfit.variable} ${spaceGrotesk.variable} dark:bg-gray-900`}
      >
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
