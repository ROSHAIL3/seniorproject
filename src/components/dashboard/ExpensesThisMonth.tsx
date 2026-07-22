import ComponentCard from "@/components/common/ComponentCard";
import DashboardEmptyState from "./DashboardEmptyState";
import type { ExpenseCategory } from "./types";
import { formatBhd } from "@/lib/formatters";

type ExpensesThisMonthProps = {
  total: number;
  categories: ExpenseCategory[];
};

export default function ExpensesThisMonth({
  total,
  categories,
}: ExpensesThisMonthProps) {
  return (
    <ComponentCard title="Expenses This Month" className="h-full">
      {categories.length > 0 ? (
        <>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total spent
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white/90">
              {formatBhd(total)}
            </p>
          </div>

          <div
            className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            aria-label="Expense distribution"
          >
            {categories.map((category) => (
              <span
                key={category.id}
                className={category.colorClass}
                style={{ width: `${category.percentage}%` }}
                title={`${category.name}: ${category.percentage}%`}
              />
            ))}
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${category.colorClass}`}
                  />
                  <span className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {category.name}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-medium text-gray-800 dark:text-white/90">
                  {formatBhd(category.amountBhd)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <DashboardEmptyState
          title="No expenses this month"
          description="Expense totals and categories will appear after an expense is added."
        />
      )}
    </ComponentCard>
  );
}
