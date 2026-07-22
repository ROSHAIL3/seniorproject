import type { Expense, ExpenseCategory } from "@/types/expenses";

export const mockExpenseCategories: ExpenseCategory[] = [
  { id: "expense-category-supplies", name: "Supplies", colorHex: "#465FFF", colorClass: "bg-brand-500", status: "Active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "expense-category-rent", name: "Rent & utilities", colorHex: "#12B76A", colorClass: "bg-success-500", status: "Active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "expense-category-marketing", name: "Marketing", colorHex: "#F79009", colorClass: "bg-warning-500", status: "Active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "expense-category-other", name: "Other", colorHex: "#0BA5EC", colorClass: "bg-blue-light-500", status: "Active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
];

export const mockExpenses: Expense[] = [
  { id: "expense-1", categoryId: "expense-category-supplies", description: "Salon supplies", amountBhd: 540, inputVatBhd: 49.091, vatTreatment: "VAT Included", incurredOn: "2026-07-04", paymentMethod: "Card", referenceNumber: "PO-2026-071", notes: "Monthly consumables order.", branchId: "branch-manama", createdAt: "2026-07-04T08:00:00.000Z", updatedAt: "2026-07-04T08:00:00.000Z" },
  { id: "expense-2", categoryId: "expense-category-rent", description: "Monthly rent and utilities", amountBhd: 385.5, inputVatBhd: 0, vatTreatment: "No VAT", incurredOn: "2026-07-01", paymentMethod: "Bank Transfer", referenceNumber: "BANK-8821", notes: "Manama branch rent.", branchId: "branch-manama", createdAt: "2026-07-01T08:00:00.000Z", updatedAt: "2026-07-01T08:00:00.000Z" },
  { id: "expense-3", categoryId: "expense-category-marketing", description: "Social media campaign", amountBhd: 198, inputVatBhd: 18, vatTreatment: "VAT Added Separately", incurredOn: "2026-07-10", paymentMethod: "Card", referenceNumber: "META-1092", notes: "July promotion.", branchId: "branch-manama", createdAt: "2026-07-10T08:00:00.000Z", updatedAt: "2026-07-10T08:00:00.000Z" },
  { id: "expense-4", categoryId: "expense-category-other", description: "General expense", amountBhd: 125, inputVatBhd: 0, vatTreatment: "No VAT", incurredOn: "2026-07-15", paymentMethod: "Cash", referenceNumber: "", notes: "", branchId: "branch-manama", createdAt: "2026-07-15T08:00:00.000Z", updatedAt: "2026-07-15T08:00:00.000Z" },
];
