"use client";

import { useEffect, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { BranchValidationError, renameBranch } from "@/services/branches.service";
import type { Branch } from "@/types/branches";

export default function RenameBranchModal({ branch, onClose, onSaved }: { branch: Branch | null; onClose: () => void; onSaved: (branch: Branch) => void | Promise<void> }) {
  const [name, setName] = useState(""); const [error, setError] = useState(""); const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (branch) { setName(branch.name); setError(""); } }, [branch]);
  const save = async () => { if (!branch) return; setIsSaving(true); setError(""); try { const saved = await renameBranch(branch.id, name); await onSaved(saved); onClose(); } catch (saveError) { if (saveError instanceof BranchValidationError) setError(saveError.fieldErrors.name ?? saveError.message); else setError(saveError instanceof Error ? saveError.message : "The branch could not be renamed."); } finally { setIsSaving(false); } };
  return <Modal isOpen={!!branch} onClose={onClose} className="m-4 max-w-lg p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Rename Branch</h2><div className="mt-6"><Label>Branch Name</Label><Input value={name} error={!!error} onChange={(event) => setName(event.target.value)} />{error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}</div><div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={onClose}>Cancel</Button><Button size="sm" onClick={save} disabled={isSaving || name.trim() === branch?.name}>{isSaving ? "Saving..." : "Rename"}</Button></div></Modal>;
}
