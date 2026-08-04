export default function AppointmentRequestsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading appointment requests">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="flex gap-4 border-b border-gray-100 p-5 last:border-0 dark:border-gray-800">
            <div className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
