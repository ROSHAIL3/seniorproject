export default function CustomersLoading() {
  return (
    <div className="space-y-6" aria-label="Loading customers">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-11 max-w-lg animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
