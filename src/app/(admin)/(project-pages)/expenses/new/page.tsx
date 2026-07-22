import type { Metadata } from "next";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { getExpenseById, getExpenseCategories, getExpenses } from "@/services/expenses.service";
import { getAppointmentSettings } from "@/services/appointment-settings.service";

export const metadata: Metadata = { title: "Add Expense | Senior Project" };

export default async function AddExpensePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [expenses, categories, editingExpense, appointmentSettings] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    edit ? getExpenseById(edit) : Promise.resolve(null),
    getAppointmentSettings(),
  ]);
  return <ExpenseForm initialExpense={editingExpense ?? undefined} initialExpenses={expenses} initialCategories={categories} taxSettings={appointmentSettings.tax} />;
}
