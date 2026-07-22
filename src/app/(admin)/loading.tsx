export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-label="Loading page">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]" />
    </div>
  );
}
