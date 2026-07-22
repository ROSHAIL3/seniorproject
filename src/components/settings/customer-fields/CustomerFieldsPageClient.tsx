"use client";

import { useState } from "react";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { AngleDownIcon, AngleUpIcon, CheckCircleIcon, PlusIcon, TrashBinIcon } from "@/icons";
import {
  createCustomerFieldDefinition,
  createCustomerFieldOption,
  customerFieldHasData,
  CustomerFieldsValidationError,
  saveCustomerFieldDefinitions,
} from "@/services/customer-fields.service";
import type { CustomerCustomFieldType, CustomerFieldDefinition } from "@/types/customer-fields";

const fieldTypes: CustomerCustomFieldType[] = ["Text", "Number", "Email", "Phone", "Date", "Dropdown", "Checkbox", "Textarea"];

export default function CustomerFieldsPageClient({ initialFields }: { initialFields: CustomerFieldDefinition[] }) {
  const [fields, setFields] = useState(initialFields.map(cloneField));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerFieldDefinition | null>(null);

  const addField = () => setFields((current) => [...current, createCustomerFieldDefinition(current.length)]);
  const updateField = (id: string, update: Partial<CustomerFieldDefinition>) => setFields((current) => current.map((field) => {
    if (field.id !== id) return field;
    const next = { ...field, ...update };
    if (update.type === "Dropdown" && !next.options.length) next.options = [createCustomerFieldOption(0)];
    if (update.type && update.type !== "Dropdown") next.options = [];
    return next;
  }));
  const moveField = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= fields.length) return; const next = [...fields]; [next[index], next[target]] = [next[target], next[index]]; setFields(next); };
  const requestDelete = async (field: CustomerFieldDefinition) => { if (await customerFieldHasData(field.id)) setDeleteTarget(field); else removeField(field.id); };
  const removeField = (id: string) => { setFields((current) => current.filter((field) => field.id !== id)); setDeleteTarget(null); };

  const updateOption = (fieldId: string, optionId: string, label: string) => setFields((current) => current.map((field) => field.id === fieldId ? { ...field, options: field.options.map((option) => option.id === optionId ? { ...option, label } : option) } : field));
  const addOption = (fieldId: string) => setFields((current) => current.map((field) => field.id === fieldId ? { ...field, options: [...field.options, createCustomerFieldOption(field.options.length)] } : field));
  const removeOption = (fieldId: string, optionId: string) => setFields((current) => current.map((field) => field.id === fieldId ? { ...field, options: field.options.filter((option) => option.id !== optionId) } : field));
  const moveOption = (fieldId: string, index: number, direction: -1 | 1) => setFields((current) => current.map((field) => { if (field.id !== fieldId) return field; const target = index + direction; if (target < 0 || target >= field.options.length) return field; const options = [...field.options]; [options[index], options[target]] = [options[target], options[index]]; return { ...field, options }; }));

  const save = async () => {
    setIsSaving(true); setErrors({}); setNotice("");
    try { const saved = await saveCustomerFieldDefinitions(fields); setFields(saved.map(cloneField)); setNotice("Customer information fields saved. Connected customer forms have been updated."); }
    catch (error) { if (error instanceof CustomerFieldsValidationError) setErrors(error.fieldErrors); else setErrors({ form: error instanceof Error ? error.message : "The fields could not be saved." }); }
    finally { setIsSaving(false); }
  };

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">Customer Information Fields</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure additional fields shown when customers are created or edited.</p></div><Button size="sm" variant="outline" startIcon={<PlusIcon />} onClick={addField}>Add Field</Button></div>{notice && <div role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">{notice}</div>}{errors.form && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{errors.form}</div>}<div className="space-y-4">{fields.length ? fields.map((field, index) => <div key={field.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5"><div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr_auto_auto]"><div><span className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Label</span><Input value={field.label} error={!!errors[`field.${field.id}.label`]} onChange={(event) => updateField(field.id, { label: event.target.value })} placeholder="Field label" />{errors[`field.${field.id}.label`] && <ErrorText>{errors[`field.${field.id}.label`]}</ErrorText>}</div><div><span className="mb-1.5 block text-xs font-medium uppercase text-gray-400">Type</span><Select key={`${field.id}-${field.type}`} options={fieldTypes.map((type) => ({ value: type, label: type }))} defaultValue={field.type} onChange={(type) => updateField(field.id, { type: type as CustomerCustomFieldType })} /></div><div className="pt-7"><Checkbox label="Required" checked={field.required} onChange={(required) => updateField(field.id, { required })} /></div><div className="flex items-center justify-end gap-1 pt-6"><IconButton label="Move up" disabled={index === 0} onClick={() => moveField(index, -1)}><AngleUpIcon /></IconButton><IconButton label="Move down" disabled={index === fields.length - 1} onClick={() => moveField(index, 1)}><AngleDownIcon /></IconButton><IconButton label="Delete field" danger onClick={() => requestDelete(field)}><TrashBinIcon /></IconButton></div></div>{field.type === "Dropdown" && <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-medium text-gray-800 dark:text-white/90">Dropdown Options</p><p className="text-xs text-gray-500 dark:text-gray-400">Options appear in this order.</p></div><Button size="sm" variant="outline" startIcon={<PlusIcon />} onClick={() => addOption(field.id)} className="!min-h-9 !px-3 !py-1.5">Add Option</Button></div><div className="space-y-2">{field.options.map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2"><span className="w-6 text-center text-xs text-gray-400">{optionIndex + 1}</span><div className="min-w-0 flex-1"><Input value={option.label} onChange={(event) => updateOption(field.id, option.id, event.target.value)} placeholder="Option label" className="!h-9 !py-1.5" /></div><IconButton label="Move option up" disabled={optionIndex === 0} onClick={() => moveOption(field.id, optionIndex, -1)}><AngleUpIcon /></IconButton><IconButton label="Move option down" disabled={optionIndex === field.options.length - 1} onClick={() => moveOption(field.id, optionIndex, 1)}><AngleDownIcon /></IconButton><IconButton label="Remove option" danger onClick={() => removeOption(field.id, option.id)}><TrashBinIcon /></IconButton></div>)}</div>{errors[`field.${field.id}.options`] && <ErrorText>{errors[`field.${field.id}.options`]}</ErrorText>}</div>}</div>) : <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center dark:border-gray-700 dark:bg-white/[0.02]"><h2 className="font-medium text-gray-800 dark:text-white/90">No custom fields</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The default customer fields will continue to appear.</p><Button size="sm" startIcon={<PlusIcon />} onClick={addField} className="mt-4">Add Field</Button></div>}</div><div className="flex justify-end"><Button size="sm" startIcon={<CheckCircleIcon />} onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : "Save All Changes"}</Button></div><Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} className="m-4 max-w-lg p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Delete customer field?</h2><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">“{deleteTarget?.label}” already contains customer data. Deleting it will also remove the saved values and cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button size="sm" onClick={() => deleteTarget && removeField(deleteTarget.id)}>Delete Field</Button></div></Modal></div>;
}

function cloneField(field: CustomerFieldDefinition): CustomerFieldDefinition { return { ...field, options: field.options.map((option) => ({ ...option })) }; }
function ErrorText({ children }: { children: React.ReactNode }) { return <p className="mt-1.5 text-xs text-error-500">{children}</p>; }
function IconButton({ label, onClick, disabled = false, danger = false, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) { return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white transition disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-700 dark:bg-gray-900 [&>svg]:size-4 ${danger ? "text-error-500 hover:bg-error-50" : "text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/5"}`}>{children}</button>; }
