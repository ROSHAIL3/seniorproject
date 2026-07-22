"use client";

import { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { useExpenseData } from "@/hooks/useExpenseData";
import { removeExpenseCategory } from "@/services/expenses.service";
import type { Expense, ExpenseCategory } from "@/types/expenses";
import ExpenseCategoryModal from "./ExpenseCategoryModal";

export default function ExpenseCategoriesClient({ initialExpenses, initialCategories }: { initialExpenses: Expense[]; initialCategories: ExpenseCategory[] }) {
  const { expenses, categories } = useExpenseData(initialExpenses, initialCategories);
  const [modalCategory, setModalCategory] = useState<ExpenseCategory | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmRemoval = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      const result = await removeExpenseCategory(deleteTarget.id);
      setMessage(result === "archived" ? "This category is used by expenses, so it was archived instead of deleted." : "Category deleted successfully.");
      setDeleteTarget(null);
    } catch {
      setError("The category could not be removed.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Expense Categories</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage the categories available when recording expenses.</p></div><Button size="sm" startIcon={<PlusIcon />} onClick={() => { setModalCategory(undefined); setIsFormOpen(true); }}>Add Category</Button></div>
      {message && <div className="rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500">{message}</div>}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto"><Table className="min-w-[640px]"><TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"><TableRow>{["Color", "Name", "Status", "Actions"].map((heading) => <TableCell key={heading} isHeader className="px-6 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{heading}</TableCell>)}</TableRow></TableHeader><TableBody className="divide-y divide-gray-100 dark:divide-gray-800">{categories.map((category) => <TableRow key={category.id}><TableCell className="px-6 py-4"><span className="block size-6 rounded-full" style={{ backgroundColor: category.colorHex }} /></TableCell><TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{category.name}</TableCell><TableCell className="px-6 py-4"><Badge size="sm" color={category.status === "Active" ? "success" : "light"}>{category.status}</Badge></TableCell><TableCell className="px-6 py-4"><div className="flex items-center gap-2"><button type="button" aria-label={`Edit ${category.name}`} title="Edit" onClick={() => { setModalCategory(category); setIsFormOpen(true); }} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"><PencilIcon className="block size-5 shrink-0" /></button><button type="button" aria-label={`Delete ${category.name}`} title="Delete" onClick={() => setDeleteTarget(category)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-error-500/30 dark:hover:bg-error-500/10"><TrashBinIcon className="block size-5 shrink-0" /></button></div></TableCell></TableRow>)}</TableBody></Table></div>
      </div>
      <ExpenseCategoryModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} category={modalCategory} />
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} className="max-w-lg p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Remove category?</h2><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{deleteTarget && expenses.some((expense) => expense.categoryId === deleteTarget.id) ? "This category is already used by expenses. It will be archived and removed from new expense forms." : "This unused category will be permanently deleted."}</p>{error && <p className="mt-3 text-sm text-error-500">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button size="sm" onClick={confirmRemoval} disabled={isDeleting}>{isDeleting ? "Processing..." : "Confirm"}</Button></div></Modal>
    </div>
  );
}
