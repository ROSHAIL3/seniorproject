"use client";

import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import type { ExpenseCategory, PaymentMethod } from "@/types/expenses";
import { SearchIcon } from "@/icons";

export type PaymentMethodFilter = PaymentMethod | "all";

export default function ExpenseFilters({
  search,
  categoryId,
  paymentMethod,
  fromDate,
  toDate,
  categories,
  onSearchChange,
  onCategoryChange,
  onPaymentMethodChange,
  onFromDateChange,
  onToDateChange,
}: {
  search: string;
  categoryId: string;
  paymentMethod: PaymentMethodFilter;
  fromDate: string;
  toDate: string;
  categories: ExpenseCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethodFilter) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}) {
  const categoryOptions = [
    { value: "all", label: "All categories" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];
  const paymentOptions = [
    { value: "all", label: "All payment methods" },
    ...["Cash", "Card", "Bank Transfer", "Other"].map((method) => ({ value: method, label: method })),
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Input startIcon={<SearchIcon />} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search expenses" ariaLabel="Search expenses" />
      <Select key={`category-${categoryId}`} options={categoryOptions} defaultValue={categoryId} onChange={onCategoryChange} placeholder="Filter by category" />
      <Select key={`payment-${paymentMethod}`} options={paymentOptions} defaultValue={paymentMethod} onChange={(value) => onPaymentMethodChange(value as PaymentMethodFilter)} placeholder="Filter by payment method" />
      <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} ariaLabel="Expense date from" />
      <Input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} ariaLabel="Expense date to" />
    </div>
  );
}
