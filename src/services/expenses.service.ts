import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCreateInput,
  ExpenseFieldErrors,
  ExpenseUpdateInput,
} from "@/types/expenses";

const listeners = new Set<() => void>();

export class ExpenseValidationError extends Error {
  constructor(public fieldErrors: ExpenseFieldErrors) {
    super("Expense details are invalid.");
    this.name = "ExpenseValidationError";
  }
}

export function subscribeToExpenseData(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getExpenses(): Promise<Expense[]> {
  return (await request("/api/expenses")).expenses;
}

export async function getExpenseById(expenseId: string): Promise<Expense | null> {
  return (
    await request(`/api/expenses/${encodeURIComponent(expenseId)}`)
  ).expense;
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return (await request("/api/settings/expense-categories")).categories;
}

export async function createExpense(input: ExpenseCreateInput): Promise<Expense> {
  validateExpense(input);
  const { receipt: _receipt, ...databaseInput } = input;
  void _receipt;
  const expense = (
    await request("/api/expenses", {
      body: JSON.stringify(databaseInput),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  ).expense as Expense;
  notify();
  return expense;
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseUpdateInput,
): Promise<Expense> {
  validateExpense(input);
  const { receipt: _receipt, ...databaseInput } = input;
  void _receipt;
  const expense = (
    await request(`/api/expenses/${encodeURIComponent(expenseId)}`, {
      body: JSON.stringify(databaseInput),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    })
  ).expense as Expense;
  notify();
  return expense;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await request(`/api/expenses/${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
  });
  notify();
}

export async function createExpenseCategory(
  input: ExpenseCategoryInput,
): Promise<ExpenseCategory> {
  validateCategory(input);
  const category = (
    await request("/api/settings/expense-categories", {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  ).category as ExpenseCategory;
  notify();
  return category;
}

export async function updateExpenseCategory(
  categoryId: string,
  input: ExpenseCategoryInput,
): Promise<ExpenseCategory> {
  validateCategory(input);
  const category = (
    await request(
      `/api/settings/expense-categories/${encodeURIComponent(categoryId)}`,
      {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    )
  ).category as ExpenseCategory;
  notify();
  return category;
}

export async function removeExpenseCategory(
  categoryId: string,
): Promise<"archived" | "deleted"> {
  const result = (
    await request(
      `/api/settings/expense-categories/${encodeURIComponent(categoryId)}`,
      { method: "DELETE" },
    )
  ).result as "archived" | "deleted";
  notify();
  return result;
}

function validateExpense(input: ExpenseUpdateInput | ExpenseCreateInput) {
  const errors: ExpenseFieldErrors = {};
  if (!Number.isFinite(input.amountBhd) || input.amountBhd <= 0) {
    errors.amountBhd = "Amount must be greater than zero.";
  }
  if (!input.incurredOn) errors.incurredOn = "Date is required.";
  if (!input.categoryId) errors.categoryId = "Select an active expense category.";
  if (!input.branchId) errors.branchId = "Select an active branch.";
  if (!input.paymentMethod) errors.paymentMethod = "Payment method is required.";
  if (!Number.isFinite(input.inputVatBhd) || input.inputVatBhd < 0) {
    errors.inputVatBhd = "VAT cannot be negative.";
  } else if (input.inputVatBhd > input.amountBhd) {
    errors.inputVatBhd = "VAT cannot be greater than the expense amount.";
  } else if (input.vatTreatment === "No VAT" && input.inputVatBhd !== 0) {
    errors.inputVatBhd = "Input VAT must be zero when VAT is not applied.";
  }
  if (Object.keys(errors).length) throw new ExpenseValidationError(errors);
}

function validateCategory(input: ExpenseCategoryInput) {
  if (!input.name.trim()) throw new Error("Category name is required.");
  if (!/^#[0-9a-fA-F]{6}$/.test(input.colorHex.trim())) {
    throw new Error("Choose a valid category color.");
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Expense request failed.");
  return body;
}
