"use client";

import Button from "@/components/ui/button/Button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-error-200 bg-white px-6 text-center dark:border-error-500/30 dark:bg-white/[0.03]">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        This page could not be loaded
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        The data service returned an error. Try Loading the page again.
      </p>
      <Button className="mt-5" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
