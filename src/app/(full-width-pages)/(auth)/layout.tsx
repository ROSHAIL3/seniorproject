import GridShape from "@/components/common/GridShape";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import BrandLogo from "@/components/common/BrandLogo";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell relative min-h-screen bg-gray-50 p-6 text-gray-800 dark:bg-gray-900 dark:text-white/90 sm:p-0">
      <ThemeProvider>
        <div className="relative flex min-h-screen w-full flex-col justify-center sm:p-0 lg:flex-row">
          {children}
          <div className="hidden min-h-screen w-full items-center border-l border-gray-800 bg-gray-900 lg:grid lg:w-1/2 dark:bg-gray-dark">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  <BrandLogo inverted size="lg" className="text-white" priority />
                </Link>
                <p className="text-center text-gray-400">
                  Manage appointments, customers and business performance in one place.
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeToggleButton />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
