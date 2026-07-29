import type { Metadata } from "next";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { getExpenseById, getExpenseCategories, getExpenses } from "@/services/expenses.service";
import { mockAppointmentSettings } from "@/data/mock/appointment-settings";

export const metadata: Metadata = { title: "Add Expense | Senior Project" };

export default async function AddExpensePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [expenses, categories, editingExpense, appointmentSettings] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    edit ? getExpenseById(edit) : Promise.resolve(null),
    Promise.resolve(mockAppointmentSettings),
  ]);
  return <ExpenseForm initialExpense={editingExpense ?? undefined} initialExpenses={expenses} initialCategories={categories} taxSettings={appointmentSettings.tax} />;
}
