"use client";
import Button from "@/components/ui/button/Button";
export default function ExpensesError({ reset }: { reset: () => void }) {
  return <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-error-200 bg-white px-6 text-center dark:border-error-500/30 dark:bg-white/[0.03]"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Expenses could not be loaded</h2><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">The expense service returned an error.</p><Button size="sm" className="mt-5" onClick={reset}>Try again</Button></div>;
}
