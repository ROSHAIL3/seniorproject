"use client";

import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { formatBhd, formatDisplayDate } from "@/lib/formatters";
import { deleteExpense } from "@/services/expenses.service";
import type { Expense, ExpenseCategory } from "@/types/expenses";
import { useState } from "react";

export default function ExpenseTable({
  expenses,
  categories,
  isLoading,
}: {
  expenses: Expense[];
  categories: ExpenseCategory[];
  isLoading: boolean;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  if (isLoading) return <ExpenseTableLoading />;
  if (expenses.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <h3 className="font-medium text-gray-800 dark:text-white/90">No expenses found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try different filters or add a new expense.</p>
      </div>
    );
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      setDeleteError("The expense could not be deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-[1250px]">
          <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableRow>
              {["Date", "Category", "Description", "Amount", "Input VAT", "Payment Method", "Reference Number", "Actions"].map((heading) => (
                <TableCell key={heading} isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{heading}</TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {expenses.map((expense) => {
              const category = categoryMap.get(expense.categoryId);
              return (
                <TableRow key={expense.id}>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDisplayDate(expense.incurredOn)}</TableCell>
                  <TableCell className="px-5 py-4"><span className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="size-2.5 rounded-full" style={{ backgroundColor: category?.colorHex ?? "#98A2B3" }} />{category?.name ?? "Unknown"}</span></TableCell>
                  <TableCell className="max-w-xs truncate px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{expense.description || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{formatBhd(expense.amountBhd)}</TableCell>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatBhd(expense.inputVatBhd)}</TableCell>
                  <TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{expense.paymentMethod}</TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{expense.referenceNumber || "—"}</TableCell>
                  <TableCell className="px-5 py-4"><div className="flex items-center gap-2"><Link href={`/expenses/new?edit=${expense.id}`} aria-label="Edit expense" title="Edit" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"><PencilIcon className="block size-5 shrink-0" /></Link><button type="button" aria-label="Delete expense" title="Delete" onClick={() => setDeleteTarget(expense)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-error-500/30 dark:hover:bg-error-500/10"><TrashBinIcon className="block size-5 shrink-0" /></button></div></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} className="max-w-lg p-6 sm:p-8">
        <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Delete expense?</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">This will remove the expense and immediately recalculate all totals.</p>
        {deleteError && <p className="mt-3 text-sm text-error-500">{deleteError}</p>}
        <div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button size="sm" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</Button></div>
      </Modal>
    </>
  );
}

function ExpenseTableLoading() {
  return <div className="space-y-3 p-5" aria-label="Loading expenses">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>;
}
