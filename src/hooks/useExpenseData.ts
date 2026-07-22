"use client";

import { useEffect, useState } from "react";
import {
  getExpenseCategories,
  getExpenses,
  subscribeToExpenseData,
} from "@/services/expenses.service";
import type { Expense, ExpenseCategory } from "@/types/expenses";

export function useExpenseData(
  initialExpenses: Expense[],
  initialCategories: ExpenseCategory[],
) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    let isActive = true;
    const refresh = async () => {
      const [nextExpenses, nextCategories] = await Promise.all([
        getExpenses(),
        getExpenseCategories(),
      ]);
      if (!isActive) return;
      setExpenses(nextExpenses);
      setCategories(nextCategories);
    };
    void refresh();
    const unsubscribe = subscribeToExpenseData(() => void refresh());
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return { expenses, categories };
}
