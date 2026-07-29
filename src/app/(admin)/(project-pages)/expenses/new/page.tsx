import type { Metadata } from "next";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import {
  getExpenseByIdFromDatabase,
  getExpenseCategoriesFromDatabase,
  getExpensesFromDatabase,
} from "@/server/expenses.repository";
import { getBranchesFromDatabase } from "@/server/branches.repository";
import { getAppointmentSettingsFromDatabase } from "@/server/appointment-settings.repository";

export const metadata: Metadata = { title: "Add Expense | Senior Project" };

export default async function AddExpensePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [expenses, categories, editingExpense, appointmentSettings, branches] = await Promise.all([
    getExpensesFromDatabase(),
    getExpenseCategoriesFromDatabase(),
    edit ? getExpenseByIdFromDatabase(edit) : Promise.resolve(null),
    getAppointmentSettingsFromDatabase(),
    getBranchesFromDatabase(),
  ]);
  return <ExpenseForm initialExpense={editingExpense ?? undefined} initialExpenses={expenses} initialCategories={categories} taxSettings={appointmentSettings.tax} branches={branches} />;
}
