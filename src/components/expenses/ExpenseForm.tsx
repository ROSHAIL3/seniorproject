"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/form/input/InputField";
import FileInput from "@/components/form/input/FileInput";
import Radio from "@/components/form/input/Radio";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, CheckCircleIcon } from "@/icons";
import { REFERENCE_TODAY } from "@/config/business";
import { useExpenseData } from "@/hooks/useExpenseData";
import {
  calculateExpenseInputVat,
} from "@/services/appointment-settings.service";
import {
  createExpense,
  ExpenseValidationError,
  updateExpense,
} from "@/services/expenses.service";
import type {
  Expense,
  ExpenseCategory,
  ExpenseFieldErrors,
  PaymentMethod,
  ReceiptAttachment,
  VatTreatment,
} from "@/types/expenses";
import type { TaxVatSettings } from "@/types/appointment-settings";

const paymentOptions = ["Cash", "Card", "Bank Transfer", "Other"].map((value) => ({ value, label: value }));
const vatTreatments: VatTreatment[] = ["VAT Included", "VAT Added Separately", "No VAT"];

export default function ExpenseForm({
  initialExpense,
  initialExpenses,
  initialCategories,
  taxSettings,
}: {
  initialExpense?: Expense;
  initialExpenses: Expense[];
  initialCategories: ExpenseCategory[];
  taxSettings: TaxVatSettings;
}) {
  const router = useRouter();
  const { categories } = useExpenseData(initialExpenses, initialCategories);
  const [amount, setAmount] = useState(initialExpense?.amountBhd.toFixed(3) ?? "0.000");
  const [incurredOn, setIncurredOn] = useState(initialExpense?.incurredOn ?? REFERENCE_TODAY);
  const [description, setDescription] = useState(initialExpense?.description ?? "");
  const [categoryId, setCategoryId] = useState(initialExpense?.categoryId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(initialExpense?.paymentMethod ?? "");
  const [referenceNumber, setReferenceNumber] = useState(initialExpense?.referenceNumber ?? "");
  const [inputVat, setInputVat] = useState(initialExpense?.inputVatBhd.toFixed(3) ?? "0.000");
  const defaultVatTreatment: VatTreatment = taxSettings.enabled ? (taxSettings.type === "Inclusive" ? "VAT Included" : "VAT Added Separately") : "No VAT";
  const [vatTreatment, setVatTreatment] = useState<VatTreatment>(initialExpense?.vatTreatment ?? defaultVatTreatment);
  const [receipt, setReceipt] = useState<ReceiptAttachment | undefined>(initialExpense?.receipt);
  const [notes, setNotes] = useState(initialExpense?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<ExpenseFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const submissionId = useRef("");

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.status === "Active" || category.id === initialExpense?.categoryId)
        .map((category) => ({ value: category.id, label: category.status === "Archived" ? `${category.name} (Archived)` : category.name })),
    [categories, initialExpense?.categoryId],
  );

  const normalizeMoney = (value: string, setter: (value: string) => void) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) setter(numeric.toFixed(3));
  };

  const applyConfiguredVat = (nextAmount: string, treatment = vatTreatment) => {
    if (initialExpense) return;
    const numeric = Number(nextAmount);
    if (!Number.isFinite(numeric)) return;
    setInputVat(calculateExpenseInputVat(numeric, treatment, taxSettings).toFixed(3));
  };

  const handleReceipt = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Receipt attachment must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setReceipt({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl: reader.result });
      setFormError("");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (isSaving) return;
    const errors: ExpenseFieldErrors = {};
    if (!/^\d+\.\d{3}$/.test(amount) || Number(amount) <= 0) errors.amountBhd = "Enter an amount greater than zero using three decimal places.";
    if (!incurredOn) errors.incurredOn = "Date is required.";
    if (!categoryId) errors.categoryId = "Category is required.";
    if (!paymentMethod) errors.paymentMethod = "Payment method is required.";
    if (!/^\d+\.\d{3}$/.test(inputVat) || Number(inputVat) < 0) errors.inputVatBhd = "Enter a non-negative VAT amount using three decimal places.";
    else if (Number(inputVat) > Number(amount)) errors.inputVatBhd = "VAT cannot be greater than the expense amount.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setIsSaving(true);
    setFieldErrors({});
    setFormError("");
    const input = {
      amountBhd: Number(amount),
      incurredOn,
      description: description.trim(),
      categoryId,
      paymentMethod: paymentMethod as PaymentMethod,
      referenceNumber: referenceNumber.trim(),
      inputVatBhd: Number(inputVat),
      vatTreatment,
      receipt,
      notes: notes.trim(),
      branchId: initialExpense?.branchId ?? "branch-manama",
    };
    try {
      if (initialExpense) await updateExpense(initialExpense.id, input);
      else {
        if (!submissionId.current) submissionId.current = crypto.randomUUID();
        await createExpense({ ...input, submissionId: submissionId.current });
      }
      router.push("/expenses");
    } catch (error) {
      if (error instanceof ExpenseValidationError) setFieldErrors(error.fieldErrors);
      else setFormError(error instanceof Error ? error.message : "The expense could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Link href="/expenses" aria-label="Back to Expenses" className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"><ChevronLeftIcon className="size-5" /></Link><div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{initialExpense ? "Edit Expense" : "Add Expense"}</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Amounts are recorded in BHD with three decimal places.</p></div></div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <ExpenseField label="Amount (BHD)" required error={fieldErrors.amountBhd}><Input type="number" min="0" step={0.001} value={amount} onChange={(event) => setAmount(event.target.value)} onBlur={() => { normalizeMoney(amount, setAmount); applyConfiguredVat(amount); }} error={!!fieldErrors.amountBhd} /></ExpenseField>
          <ExpenseField label="Date" required error={fieldErrors.incurredOn}><Input type="date" value={incurredOn} onChange={(event) => setIncurredOn(event.target.value)} error={!!fieldErrors.incurredOn} /></ExpenseField>
          <div className="md:col-span-2"><Label>Description</Label><TextArea value={description} onChange={setDescription} rows={3} placeholder="Describe this expense" /></div>
          <ExpenseField label="Category" required error={fieldErrors.categoryId}><Select key={categoryId} options={categoryOptions} defaultValue={categoryId} onChange={setCategoryId} placeholder="Select category" /></ExpenseField>
          <ExpenseField label="Payment Method" required error={fieldErrors.paymentMethod}><Select key={paymentMethod} options={paymentOptions} defaultValue={paymentMethod} onChange={(value) => setPaymentMethod(value as PaymentMethod)} placeholder="Select payment method" /></ExpenseField>
          <ExpenseField label="Reference Number"><Input value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="Vendor invoice or payment reference" /></ExpenseField>
          <ExpenseField label="Input VAT Amount" error={fieldErrors.inputVatBhd}><Input type="number" min="0" step={0.001} value={inputVat} onChange={(event) => setInputVat(event.target.value)} onBlur={() => normalizeMoney(inputVat, setInputVat)} disabled={vatTreatment === "No VAT"} error={!!fieldErrors.inputVatBhd} /></ExpenseField>
          <div className="md:col-span-2"><Label>VAT treatment</Label><div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:gap-6">{vatTreatments.map((treatment) => <Radio key={treatment} id={`vat-${treatment.replaceAll(" ", "-")}`} name="vat-treatment" value={treatment} label={treatment} checked={vatTreatment === treatment} onChange={(value) => { const next = value as VatTreatment; setVatTreatment(next); setInputVat(calculateExpenseInputVat(Number(amount) || 0, next, taxSettings).toFixed(3)); }} />)}</div><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Defaulted from Appointment Settings: {taxSettings.enabled ? `${taxSettings.type} VAT at ${taxSettings.ratePercent}%` : "VAT disabled"}.</p></div>
          <div><Label>Receipt attachment</Label><FileInput onChange={(event) => handleReceipt(event.target.files?.[0])} />{receipt && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Attached: {receipt.fileName}</p>}</div>
          <div><Label>Notes</Label><TextArea value={notes} onChange={setNotes} rows={3} placeholder="Internal notes" /></div>
        </div>
        {formError && <p className="mt-5 text-sm text-error-500">{formError}</p>}
      </div>
      <div className="flex justify-end gap-3"><Button href="/expenses" size="sm" variant="outline">Cancel</Button><Button size="sm" onClick={save} disabled={isSaving} startIcon={<CheckCircleIcon />}>{isSaving ? "Saving..." : initialExpense ? "Save Changes" : "Add Expense"}</Button></div>
    </div>
  );
}

function ExpenseField({ label, required = false, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div><Label>{label} {required && <span className="text-error-500">*</span>}</Label>{children}{error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}</div>;
}
