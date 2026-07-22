"use client";

import { useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { createExpenseCategory, updateExpenseCategory } from "@/services/expenses.service";
import type { ExpenseCategory } from "@/types/expenses";

export default function ExpenseCategoryModal({
  isOpen,
  onClose,
  category,
}: {
  isOpen: boolean;
  onClose: () => void;
  category?: ExpenseCategory;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#465FFF");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name ?? "");
    setColor(category?.colorHex ?? "#465FFF");
    setError("");
  }, [category, isOpen]);

  const save = async () => {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      if (category) await updateExpenseCategory(category.id, { name, colorHex: color });
      else await createExpenseCategory({ name, colorHex: color });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The category could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 sm:p-8">
      <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">{category ? "Edit Category" : "New Category"}</h2>
      <div className="mt-6 space-y-4">
        <div><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} error={!!error} /></div>
        <div><Label>Color</Label><div className="flex items-center gap-3"><input type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-900" /><div className="flex-1"><Input value={color} onChange={(event) => setColor(event.target.value)} /></div></div></div>
        {error && <p className="text-sm text-error-500">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={onClose}>Cancel</Button><Button size="sm" onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : category ? "Save Changes" : "Create"}</Button></div>
    </Modal>
  );
}
