import type { Metadata } from "next";
import ExpenseCategoriesClient from "@/components/expenses/ExpenseCategoriesClient";
import { getExpenseCategories, getExpenses } from "@/services/expenses.service";

export const metadata: Metadata = { title: "Expense Categories | Senior Project" };

export default async function ExpenseCategoriesPage() {
  const [expenses, categories] = await Promise.all([getExpenses(), getExpenseCategories()]);
  return <ExpenseCategoriesClient initialExpenses={expenses} initialCategories={categories} />;
}
