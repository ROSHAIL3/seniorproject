import { mockExpenseCategories, mockExpenses } from "@/data/mock/expenses";
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCreateInput,
  ExpenseFieldErrors,
  ExpenseUpdateInput,
} from "@/types/expenses";
import { DEFAULT_ACTIVITY_ACTOR, logActivity } from "./activity-log.service";

let expenseStore = mockExpenses.map((expense) => ({ ...expense }));
let categoryStore = mockExpenseCategories.map((category) => ({ ...category }));
const processedSubmissionIds = new Set<string>();
const expenseListeners = new Set<() => void>();

export class ExpenseValidationError extends Error {
  constructor(public fieldErrors: ExpenseFieldErrors) {
    super("Expense details are invalid.");
    this.name = "ExpenseValidationError";
  }
}

export function subscribeToExpenseData(listener: () => void) {
  expenseListeners.add(listener);
  return () => expenseListeners.delete(listener);
}

const notify = () => expenseListeners.forEach((listener) => listener());

export async function getExpenses(): Promise<Expense[]> {
  return expenseStore.map((expense) => ({
    ...expense,
    receipt: expense.receipt ? { ...expense.receipt } : undefined,
  }));
}

export async function getExpenseById(expenseId: string): Promise<Expense | null> {
  const expense = expenseStore.find((item) => item.id === expenseId);
  return expense
    ? { ...expense, receipt: expense.receipt ? { ...expense.receipt } : undefined }
    : null;
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return categoryStore.map((category) => ({ ...category }));
}

export async function createExpense(input: ExpenseCreateInput): Promise<Expense> {
  if (processedSubmissionIds.has(input.submissionId)) {
    throw new Error("This expense submission was already processed.");
  }
  validateExpense(input);
  const timestamp = new Date().toISOString();
  const sequence = Math.max(0, ...expenseStore.map((expense) => Number(expense.id.replace("expense-", "")) || 0)) + 1;
  const expense: Expense = {
    ...input,
    id: `expense-${sequence}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  delete (expense as Expense & { submissionId?: string }).submissionId;
  processedSubmissionIds.add(input.submissionId);
  expenseStore = [...expenseStore, expense];
  notify();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense created", category: "Expenses", targetType: "expense", targetId: expense.id, description: "Created a new expense record.", metadata: { category: categoryStore.find((item) => item.id === expense.categoryId)?.name, amountBhd: expense.amountBhd, branch: expense.branchId }, newValues: { amountBhd: expense.amountBhd, incurredOn: expense.incurredOn, paymentMethod: expense.paymentMethod }, source: "expenses" });
  return { ...expense };
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseUpdateInput,
): Promise<Expense> {
  const current = expenseStore.find((expense) => expense.id === expenseId);
  if (!current) throw new Error("Expense record was not found.");
  validateExpense(input, current.categoryId);
  const updated: Expense = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  expenseStore = expenseStore.map((expense) =>
    expense.id === expenseId ? updated : expense,
  );
  notify();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense edited", category: "Expenses", targetType: "expense", targetId: expenseId, description: "Updated an expense record.", metadata: { category: categoryStore.find((item) => item.id === updated.categoryId)?.name, amountBhd: updated.amountBhd, branch: updated.branchId }, oldValues: { amountBhd: current.amountBhd, categoryId: current.categoryId, incurredOn: current.incurredOn }, newValues: { amountBhd: updated.amountBhd, categoryId: updated.categoryId, incurredOn: updated.incurredOn }, source: "expenses" });
  return { ...updated };
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const current = expenseStore.find((expense) => expense.id === expenseId);
  if (!current) throw new Error("Expense record was not found.");
  expenseStore = expenseStore.filter((expense) => expense.id !== expenseId);
  notify();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense deleted", category: "Expenses", targetType: "expense", targetId: expenseId, description: "Deleted an expense record.", metadata: { category: categoryStore.find((item) => item.id === current.categoryId)?.name, amountBhd: current.amountBhd, branch: current.branchId }, oldValues: { amountBhd: current.amountBhd, incurredOn: current.incurredOn }, source: "expenses" });
}

export async function createExpenseCategory(
  input: ExpenseCategoryInput,
): Promise<ExpenseCategory> {
  validateCategoryName(input.name);
  const timestamp = new Date().toISOString();
  const category: ExpenseCategory = {
    id: `expense-category-${crypto.randomUUID()}`,
    name: input.name.trim(),
    colorHex: normalizeColor(input.colorHex),
    colorClass: "bg-brand-500",
    status: "Active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  categoryStore = [...categoryStore, category];
  notify();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense category created", category: "Expenses", targetType: "expense category", targetId: category.id, description: `Created expense category ${category.name}.`, metadata: { category: category.name }, newValues: { name: category.name, status: category.status }, source: "expense-categories" });
  return { ...category };
}

export async function updateExpenseCategory(
  categoryId: string,
  input: ExpenseCategoryInput,
): Promise<ExpenseCategory> {
  validateCategoryName(input.name, categoryId);
  const current = categoryStore.find((category) => category.id === categoryId);
  if (!current) throw new Error("Expense category was not found.");
  const updated = {
    ...current,
    name: input.name.trim(),
    colorHex: normalizeColor(input.colorHex),
    updatedAt: new Date().toISOString(),
  };
  categoryStore = categoryStore.map((category) =>
    category.id === categoryId ? updated : category,
  );
  notify();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense category edited", category: "Expenses", targetType: "expense category", targetId: categoryId, description: `Updated expense category ${updated.name}.`, metadata: { category: updated.name }, oldValues: { name: current.name, colorHex: current.colorHex }, newValues: { name: updated.name, colorHex: updated.colorHex }, source: "expense-categories" });
  return { ...updated };
}

export async function removeExpenseCategory(
  categoryId: string,
): Promise<"archived" | "deleted"> {
  const category = categoryStore.find((item) => item.id === categoryId);
  if (!category) throw new Error("Expense category was not found.");
  const isUsed = expenseStore.some((expense) => expense.categoryId === categoryId);
  if (isUsed) {
    categoryStore = categoryStore.map((item) =>
      item.id === categoryId
        ? { ...item, status: "Archived", updatedAt: new Date().toISOString() }
        : item,
    );
    notify();
    await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense category archived", category: "Expenses", targetType: "expense category", targetId: categoryId, description: `Archived expense category ${category.name}.`, metadata: { category: category.name }, oldValues: { status: category.status }, newValues: { status: "Archived" }, source: "expense-categories" });
    return "archived";
  }
  categoryStore = categoryStore.filter((item) => item.id !== categoryId);
  notify();
  await logActivity({ ...DEFAULT_ACTIVITY_ACTOR, action: "Expense category deleted", category: "Expenses", targetType: "expense category", targetId: categoryId, description: `Deleted expense category ${category.name}.`, metadata: { category: category.name }, source: "expense-categories" });
  return "deleted";
}

function validateExpense(
  input: ExpenseUpdateInput | ExpenseCreateInput,
  allowedArchivedCategoryId?: string,
) {
  const errors: ExpenseFieldErrors = {};
  if (!Number.isFinite(input.amountBhd) || input.amountBhd <= 0) {
    errors.amountBhd = "Amount must be greater than zero.";
  }
  if (!input.incurredOn) errors.incurredOn = "Date is required.";
  const category = categoryStore.find(
    (item) =>
      item.id === input.categoryId &&
      (item.status === "Active" || item.id === allowedArchivedCategoryId),
  );
  if (!input.categoryId || !category) {
    errors.categoryId = "Select an active expense category.";
  }
  if (!input.paymentMethod) errors.paymentMethod = "Payment method is required.";
  if (!Number.isFinite(input.inputVatBhd) || input.inputVatBhd < 0) {
    errors.inputVatBhd = "VAT cannot be negative.";
  } else if (input.inputVatBhd > input.amountBhd) {
    errors.inputVatBhd = "VAT cannot be greater than the expense amount.";
  }
  if (Object.keys(errors).length > 0) throw new ExpenseValidationError(errors);
}

function validateCategoryName(name: string, ignoreCategoryId?: string) {
  if (!name.trim()) throw new Error("Category name is required.");
  const duplicate = categoryStore.some(
    (category) =>
      category.id !== ignoreCategoryId &&
      category.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (duplicate) throw new Error("A category with this name already exists.");
}

function normalizeColor(color: string) {
  const normalized = color.trim().replace(/^#/, "");
  return `#${/^[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : "465FFF"}`;
}
