"use client";

import { useEffect, useState } from "react";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import TextArea from "@/components/form/input/TextArea";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { BranchValidationError, createBranch, updateBranch } from "@/services/branches.service";
import type { Branch, BranchFieldErrors, BranchFormOptions, BranchInput, BranchStatus } from "@/types/branches";

export default function BranchFormModal({ isOpen, onClose, onSaved, branch, options }: { isOpen: boolean; onClose: () => void; onSaved: (branch: Branch) => void | Promise<void>; branch?: Branch; options: BranchFormOptions }) {
  const [form, setForm] = useState<BranchInput>(emptyBranch(options));
  const [errors, setErrors] = useState<BranchFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(branch ? toInput(branch) : emptyBranch(options));
    setErrors({});
  }, [branch, isOpen, options]);

  const save = async () => {
    setIsSaving(true); setErrors({});
    try {
      const saved = branch ? await updateBranch(branch.id, form) : await createBranch(form);
      await onSaved(saved); onClose();
    } catch (error) {
      if (error instanceof BranchValidationError) setErrors(error.fieldErrors);
      else setErrors({ form: error instanceof Error ? error.message : "The branch could not be saved." });
    } finally { setIsSaving(false); }
  };

  return <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-3xl p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">{branch ? "Edit Branch" : "Add Branch"}</h2>{branch && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Branch code: {branch.code}</p>}<div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Branch Name" required error={errors.name} className="md:col-span-2"><Input value={form.name} error={!!errors.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Phone" required error={errors.phone}><PhoneInput value={form.phone} error={!!errors.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="3XXX XXXX" /></Field><Field label="Email" required error={errors.email}><EmailInput value={form.email} error={!!errors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Address" required error={errors.address} className="md:col-span-2"><TextArea rows={2} value={form.address} error={!!errors.address} onChange={(address) => setForm({ ...form, address })} /></Field><Field label="Google Maps Link" error={errors.googleMapsUrl} className="md:col-span-2"><Input value={form.googleMapsUrl} error={!!errors.googleMapsUrl} onChange={(event) => setForm({ ...form, googleMapsUrl: event.target.value })} placeholder="https://maps.google.com/..." /></Field><Field label="Time Zone" required error={errors.timeZone}><Select key={form.timeZone} options={options.timeZones} defaultValue={form.timeZone} onChange={(timeZone) => setForm({ ...form, timeZone })} /></Field><Field label="Status" error={errors.status}><Select key={form.status} options={options.statuses} defaultValue={form.status} onChange={(status) => setForm({ ...form, status: status as BranchStatus })} /></Field><div className="md:col-span-2"><div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800"><div><p className="text-sm font-medium text-gray-800 dark:text-white/90">Set as Main Branch</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only one branch can be the main branch.</p></div><Switch label="" checked={form.isMain} onChange={(isMain) => setForm({ ...form, isMain })} /></div>{errors.isMain && <p className="mt-1.5 text-xs text-error-500">{errors.isMain}</p>}</div>{errors.form && <p className="text-sm text-error-500 md:col-span-2">{errors.form}</p>}</div><div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={onClose}>Cancel</Button><Button size="sm" onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : branch ? "Save Changes" : "Add Branch"}</Button></div></Modal>;
}

function emptyBranch(options: BranchFormOptions): BranchInput { return { name: "", phone: "", email: "", address: "", googleMapsUrl: "", timeZone: options.timeZones[0]?.value ?? "", status: "Active", isMain: false }; }
function toInput(branch: Branch): BranchInput { return { name: branch.name, phone: branch.phone, email: branch.email, address: branch.address, googleMapsUrl: branch.googleMapsUrl, timeZone: branch.timeZone, status: branch.status, isMain: branch.isMain }; }
function Field({ label, required = false, error, className = "", children }: { label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label>{label} {required && <span className="text-error-500">*</span>}</Label>{children}{error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}</div>; }
