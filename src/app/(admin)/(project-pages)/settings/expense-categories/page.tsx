import type { Metadata } from "next";
import ExpenseCategoriesClient from "@/components/expenses/ExpenseCategoriesClient";
import {
  getExpenseCategoriesFromDatabase,
  getExpensesFromDatabase,
} from "@/server/expenses.repository";

export const metadata: Metadata = { title: "Expense Categories | Senior Project" };

export default async function ExpenseCategoriesPage() {
  const [expenses, categories] = await Promise.all([
    getExpensesFromDatabase(),
    getExpenseCategoriesFromDatabase(),
  ]);
  return <ExpenseCategoriesClient initialExpenses={expenses} initialCategories={categories} />;
}
