import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCreateInput,
  ExpenseUpdateInput,
  PaymentMethod,
  VatTreatment,
} from "@/types/expenses";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type CategoryRow = Database["public"]["Tables"]["expense_categories"]["Row"];

const paymentFromDatabase: Record<ExpenseRow["payment_method"], PaymentMethod> = {
  bank_transfer: "Bank Transfer",
  card: "Card",
  cash: "Cash",
  other: "Other",
};
const paymentToDatabase = {
  "Bank Transfer": "bank_transfer",
  Card: "card",
  Cash: "cash",
  Other: "other",
} as const;
const vatFromDatabase: Record<ExpenseRow["vat_treatment"], VatTreatment> = {
  no_vat: "No VAT",
  vat_added_separately: "VAT Added Separately",
  vat_included: "VAT Included",
};
const vatToDatabase = {
  "No VAT": "no_vat",
  "VAT Added Separately": "vat_added_separately",
  "VAT Included": "vat_included",
} as const;

export async function getExpensesFromDatabase(): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Expenses could not be loaded.");
  return data.map(mapExpense);
}

export async function getExpenseByIdFromDatabase(expenseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) throw new Error("The expense could not be loaded.");
  return data ? mapExpense(data) : null;
}

export async function getExpenseCategoriesFromDatabase(): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .order("status")
    .order("name");
  if (error) throw new Error("Expense categories could not be loaded.");
  return data.map(mapCategory);
}

export async function saveExpenseInDatabase(
  input: ExpenseCreateInput | ExpenseUpdateInput,
  expenseId: string | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_expense", {
    target_amount_bhd: input.amountBhd,
    target_branch_id: input.branchId,
    target_category_id: input.categoryId,
    target_description: input.description,
    target_expense_id: expenseId,
    target_incurred_on: input.incurredOn,
    target_input_vat_bhd: input.inputVatBhd,
    target_notes: input.notes,
    target_payment_method: paymentToDatabase[input.paymentMethod],
    target_reference_number: input.referenceNumber,
    target_submission_id:
      "submissionId" in input ? input.submissionId : null,
    target_vat_treatment: vatToDatabase[input.vatTreatment],
  });
  if (error || !data) throw new Error(expenseError(error?.message));
  return mapExpense(data);
}

export async function deleteExpenseFromDatabase(expenseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_expense", {
    target_expense_id: expenseId,
  });
  if (error) throw new Error(expenseError(error.message));
}

export async function saveExpenseCategoryInDatabase(
  input: ExpenseCategoryInput,
  categoryId: string | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_expense_category", {
    category_color_hex: normalizeColor(input.colorHex),
    category_name: input.name,
    target_category_id: categoryId,
  });
  if (error || !data) throw new Error(expenseError(error?.message));
  return mapCategory(data);
}

export async function removeExpenseCategoryFromDatabase(categoryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_expense_category", {
    target_category_id: categoryId,
  });
  if (error) throw new Error(expenseError(error.message));
  return data as "archived" | "deleted";
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    amountBhd: Number(row.amount_bhd),
    branchId: row.branch_id,
    categoryId: row.category_id,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    incurredOn: row.incurred_on,
    inputVatBhd: Number(row.input_vat_bhd),
    notes: row.notes,
    paymentMethod: paymentFromDatabase[row.payment_method],
    referenceNumber: row.reference_number,
    updatedAt: row.updated_at,
    vatTreatment: vatFromDatabase[row.vat_treatment],
  };
}

function mapCategory(row: CategoryRow): ExpenseCategory {
  return {
    colorClass: "bg-brand-500",
    colorHex: row.color_hex,
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    status: row.status === "active" ? "Active" : "Archived",
    updatedAt: row.updated_at,
  };
}

function normalizeColor(value: string) {
  return `#${String(value ?? "").trim().replace(/^#/, "").toUpperCase()}`;
}

function expenseError(message = "") {
  const errors: [string, string][] = [
    ["EXPENSE_CATEGORY_DUPLICATE", "A category with this name already exists."],
    ["EXPENSE_CATEGORY_FORBIDDEN", "You do not have permission to manage expense categories."],
    ["EXPENSE_CATEGORY_NOT_FOUND", "The expense category could not be found."],
    ["EXPENSE_CATEGORY_INVALID", "Select an active expense category."],
    ["EXPENSE_BRANCH_INVALID", "Select an active branch."],
    ["EXPENSE_NOT_FOUND", "The expense could not be found."],
    ["EXPENSE_FORBIDDEN", "You do not have permission to manage expenses."],
    ["EXPENSE_INVALID", "The expense details are invalid."],
  ];
  return errors.find(([code]) => message.includes(code))?.[1] ??
    "The expense operation could not be completed.";
}
