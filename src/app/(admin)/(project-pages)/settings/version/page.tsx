import type { Metadata } from "next";
import BrandLogo from "@/components/common/BrandLogo";

export const metadata: Metadata = {
  title: "About Slotova",
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
const APP_ENVIRONMENT =
  process.env.NEXT_PUBLIC_APP_ENVIRONMENT ??
  (process.env.NODE_ENV === "production" ? "Production" : "Development");

export default function Page() {
  const isProduction = APP_ENVIRONMENT.toLowerCase() === "production";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5">
        <p className="text-sm font-medium text-brand-500">System information</p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">
          About
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Version and environment details for your Slotova workspace.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 bg-brand-50/60 px-5 py-5 dark:border-gray-800 dark:bg-brand-500/10 sm:px-7">
          <BrandLogo size="lg" className="text-gray-900 dark:text-white" priority />
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <InfoRow label="App version">
              <span className="font-mono text-sm font-semibold text-gray-800 dark:text-white/90">
                v{APP_VERSION}
              </span>
            </InfoRow>
            <InfoRow label="Environment">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isProduction
                    ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                    : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                }`}
              >
                {APP_ENVIRONMENT}
              </span>
            </InfoRow>
          </dl>

          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
              Slotova is a booking and business management platform for salons,
              clinics, and service-based businesses.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
