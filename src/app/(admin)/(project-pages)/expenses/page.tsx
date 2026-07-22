import type { Metadata } from "next";
import ExpensesPageClient from "@/components/expenses/ExpensesPageClient";
import { getExpenseCategories, getExpenses } from "@/services/expenses.service";

export const metadata: Metadata = {
  title: "Expenses | Senior Project",
  description: "Track expenses and input VAT",
};

export default async function ExpensesPage() {
  const [expenses, categories] = await Promise.all([getExpenses(), getExpenseCategories()]);
  return <ExpensesPageClient initialExpenses={expenses} initialCategories={categories} />;
}
