"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button/Button";
import Pagination from "@/components/tables/Pagination";
import { DownloadIcon, PlusIcon } from "@/icons";
import { useExpenseData } from "@/hooks/useExpenseData";
import type { Expense, ExpenseCategory } from "@/types/expenses";
import ExpenseCategoryChart from "./ExpenseCategoryChart";
import ExpenseFilters, { type PaymentMethodFilter } from "./ExpenseFilters";
import ExpenseSummary from "./ExpenseSummary";
import ExpenseTable from "./ExpenseTable";

const PAGE_SIZE = 8;

export default function ExpensesPageClient({
  initialExpenses,
  initialCategories,
}: {
  initialExpenses: Expense[];
  initialCategories: ExpenseCategory[];
}) {
  const { expenses, categories } = useExpenseData(initialExpenses, initialCategories);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
  }, []);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const category = categoryMap.get(expense.categoryId);
      const matchesSearch =
        !normalizedSearch ||
        [expense.description, expense.referenceNumber, category?.name ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      return (
        matchesSearch &&
        (categoryId === "all" || expense.categoryId === categoryId) &&
        (paymentMethod === "all" || expense.paymentMethod === paymentMethod) &&
        (!fromDate || expense.incurredOn >= fromDate) &&
        (!toDate || expense.incurredOn <= toDate)
      );
    });
  }, [categoryId, categoryMap, expenses, fromDate, paymentMethod, search, toDate]);

  const totalExpensesBhd = expenses.reduce((total, expense) => total + expense.amountBhd, 0);
  const totalInputVatBhd = expenses.reduce((total, expense) => total + expense.inputVatBhd, 0);
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateFilter = (operation: () => void) => {
    operation();
    setPage(1);
    setIsLoading(true);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setIsLoading(false), 200);
  };

  const exportCsv = () => {
    const headings = ["Date", "Category", "Description", "Amount BHD", "Input VAT BHD", "Payment Method", "Reference Number", "VAT Treatment", "Notes"];
    const rows = filteredExpenses.map((expense) => [
      expense.incurredOn,
      categoryMap.get(expense.categoryId)?.name ?? "Unknown",
      expense.description,
      expense.amountBhd.toFixed(3),
      expense.inputVatBhd.toFixed(3),
      expense.paymentMethod,
      expense.referenceNumber,
      expense.vatTreatment,
      expense.notes,
    ]);
    const csv = [headings, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Expenses</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track business expenses and recoverable input VAT.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row"><Button size="sm" variant="outline" onClick={exportCsv} startIcon={<DownloadIcon />}>Export CSV</Button><Button size="sm" href="/expenses/new" startIcon={<PlusIcon />}>Add Expense</Button></div>
      </div>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-7"><ExpenseSummary totalExpensesBhd={totalExpensesBhd} totalInputVatBhd={totalInputVatBhd} recordCount={expenses.length} /></div>
        <div className="col-span-12 xl:col-span-5"><ExpenseCategoryChart expenses={expenses} categories={categories} /></div>
      </div>
      <ExpenseFilters
        search={search} categoryId={categoryId} paymentMethod={paymentMethod} fromDate={fromDate} toDate={toDate} categories={categories}
        onSearchChange={(value) => updateFilter(() => setSearch(value))}
        onCategoryChange={(value) => updateFilter(() => setCategoryId(value))}
        onPaymentMethodChange={(value) => updateFilter(() => setPaymentMethod(value))}
        onFromDateChange={(value) =>
          updateFilter(() => {
            setFromDate(value);
            if (value && toDate && value > toDate) setToDate(value);
          })
        }
        onToDateChange={(value) =>
          updateFilter(() => {
            setToDate(value);
            if (value && fromDate && value < fromDate) setFromDate(value);
          })
        }
      />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <ExpenseTable expenses={visibleExpenses} categories={categories} isLoading={isLoading} />
        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Showing {filteredExpenses.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredExpenses.length)} of {filteredExpenses.length}</p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
