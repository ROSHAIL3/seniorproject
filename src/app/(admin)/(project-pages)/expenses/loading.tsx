export default function ExpensesLoading() {
  return <div className="space-y-6" aria-label="Loading expenses"><div className="h-8 w-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" /><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}</div><div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" /></div>;
}
