"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import ComponentCard from "@/components/common/ComponentCard";
import { formatBhd } from "@/lib/formatters";
import type { Expense, ExpenseCategory } from "@/types/expenses";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ExpenseCategoryChart({
  expenses,
  categories,
}: {
  expenses: Expense[];
  categories: ExpenseCategory[];
}) {
  const totals = categories
    .map((category) => ({
      category,
      total: expenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + expense.amountBhd, 0),
    }))
    .filter((item) => item.total > 0);
  const options: ApexOptions = {
    chart: { type: "donut", fontFamily: "Outfit, sans-serif" },
    labels: totals.map((item) => item.category.name),
    colors: totals.map((item) => item.category.colorHex),
    legend: { position: "bottom", fontFamily: "Outfit" },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ["#ffffff"] },
    tooltip: { y: { formatter: (value) => formatBhd(value) } },
    plotOptions: { pie: { donut: { size: "64%" } } },
  };

  return (
    <ComponentCard title="Expense totals by category" className="h-full">
      {totals.length > 0 ? (
        <div className="mx-auto max-w-md">
          <ReactApexChart options={options} series={totals.map((item) => item.total)} type="donut" height={260} />
        </div>
      ) : (
        <div className="flex min-h-56 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          No expense data to chart.
        </div>
      )}
    </ComponentCard>
  );
}
