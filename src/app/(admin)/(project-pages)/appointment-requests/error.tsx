"use client";

export default function AppointmentRequestsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-error-200 bg-white px-6 text-center dark:border-error-500/30 dark:bg-white/[0.03]">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        Appointment requests could not be loaded
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Check your connection and try again. No appointment data was changed.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-theme-xs hover:bg-brand-400"
      >
        Try again
      </button>
    </div>
  );
}
