"use client";
import { useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { createServiceCategory, ServiceCategoryValidationError, updateServiceCategory } from "@/services/services.service";
import type { ServiceCategory } from "@/types/services";

export default function ServiceCategoryModal({ isOpen, onClose, category, onSaved }: { isOpen: boolean; onClose: () => void; category?: ServiceCategory; onSaved?: (category: ServiceCategory) => void }) {
  const [name, setName] = useState(""); const [active, setActive] = useState(true); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) { setName(category?.name ?? ""); setActive(category?.status !== "Archived"); setError(""); } }, [category, isOpen]);
  const save = async () => { setSaving(true); try { const result = category ? await updateServiceCategory(category.id, { name, status: active ? "Active" : "Archived" }) : await createServiceCategory({ name, status: active ? "Active" : "Archived" }); onSaved?.(result); onClose(); } catch (reason) { setError(reason instanceof ServiceCategoryValidationError ? reason.fieldErrors.name ?? reason.message : reason instanceof Error ? reason.message : "The category could not be saved."); } finally { setSaving(false); } };
  return <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">{category ? "Edit Category" : "New Category"}</h2><div className="mt-6"><Label>Category name</Label><Input value={name} error={!!error} onChange={(event) => { setName(event.target.value); setError(""); }} autoComplete="off" />{error && <p className="mt-1 text-xs text-error-500">{error}</p>}</div><div className="mt-5"><Switch label="Active" checked={active} onChange={setActive} /></div><div className="mt-7 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={onClose}>Cancel</Button><Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div></Modal>;
}
