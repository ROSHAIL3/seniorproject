import { formatBhd } from "@/lib/formatters";

export default function ExpenseSummary({
  totalExpensesBhd,
  totalInputVatBhd,
  recordCount,
}: {
  totalExpensesBhd: number;
  totalInputVatBhd: number;
  recordCount: number;
}) {
  const cards = [
    { label: "Total expenses", value: formatBhd(totalExpensesBhd) },
    { label: "Total input VAT", value: formatBhd(totalInputVatBhd) },
    { label: "Expense records", value: String(recordCount) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
