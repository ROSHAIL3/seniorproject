import type { Metadata } from "next";
import ExpensesPageClient from "@/components/expenses/ExpensesPageClient";
import {
  getExpenseCategoriesFromDatabase,
  getExpensesFromDatabase,
} from "@/server/expenses.repository";

export const metadata: Metadata = {
  title: "Expenses | Senior Project",
  description: "Track expenses and input VAT",
};

export default async function ExpensesPage() {
  const [expenses, categories] = await Promise.all([
    getExpensesFromDatabase(),
    getExpenseCategoriesFromDatabase(),
  ]);
  return <ExpensesPageClient initialExpenses={expenses} initialCategories={categories} />;
}
