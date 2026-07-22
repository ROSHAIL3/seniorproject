export type ExpenseCategoryStatus = "Active" | "Archived";
export type PaymentMethod = "Cash" | "Card" | "Bank Transfer" | "Other";
export type VatTreatment = "VAT Included" | "VAT Added Separately" | "No VAT";

export type ExpenseCategory = {
  id: string;
  name: string;
  colorHex: string;
  colorClass: string;
  status: ExpenseCategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptAttachment = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

export type Expense = {
  id: string;
  categoryId: string;
  description: string;
  amountBhd: number;
  inputVatBhd: number;
  vatTreatment: VatTreatment;
  incurredOn: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  receipt?: ReceiptAttachment;
  notes: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCreateInput = Omit<
  Expense,
  "id" | "createdAt" | "updatedAt"
> & {
  submissionId: string;
};

export type ExpenseUpdateInput = Omit<
  Expense,
  "id" | "createdAt" | "updatedAt"
>;

export type ExpenseCategoryInput = Pick<ExpenseCategory, "name" | "colorHex">;

export type ExpenseFieldErrors = Partial<
  Record<
    "amountBhd" | "inputVatBhd" | "incurredOn" | "categoryId" | "paymentMethod",
    string
  >
>;
