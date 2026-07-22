"use client";

import { useMemo, useState } from "react";
import Input from "@/components/form/input/InputField";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { BoxIcon as ArchiveIcon, PencilIcon, PlusIcon, SearchIcon, TrashBinIcon } from "@/icons";
import { archiveBranch, deleteBranch, getBranches } from "@/services/branches.service";
import type { Branch, BranchFormOptions } from "@/types/branches";
import BranchFormModal from "./BranchFormModal";
import RenameBranchModal from "./RenameBranchModal";

export default function BranchesPageClient({ initialBranches, options }: { initialBranches: Branch[]; options: BranchFormOptions }) {
  const [branches, setBranches] = useState(initialBranches);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | undefined>();
  const [renameTarget, setRenameTarget] = useState<Branch | null>(null);
  const [actionTarget, setActionTarget] = useState<{ branch: Branch; action: "archive" | "delete" } | null>(null);
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return branches;
    return branches.filter((branch) => [branch.name, branch.code, branch.phone, branch.email, branch.address].some((value) => value.toLowerCase().includes(query)));
  }, [branches, search]);

  const refresh = async () => { setBranches(await getBranches()); setError(""); };
  const openAdd = () => { setEditBranch(undefined); setFormOpen(true); };
  const openEdit = (branch: Branch) => { setEditBranch(branch); setFormOpen(true); };
  const performAction = async () => {
    if (!actionTarget) return;
    setIsWorking(true); setError("");
    try {
      if (actionTarget.action === "archive") await archiveBranch(actionTarget.branch.id);
      else await deleteBranch(actionTarget.branch.id);
      await refresh(); setActionTarget(null);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "The branch could not be updated."); }
    finally { setIsWorking(false); }
  };

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">Branches</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{branches.length} {branches.length === 1 ? "branch" : "branches"}</p></div><Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>Add Branch</Button></div>{error && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{error}</div>}<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"><div className="border-b border-gray-100 p-4 dark:border-gray-800"><div className="max-w-md"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, code, phone or email" startIcon={<SearchIcon />} ariaLabel="Search branches" /></div></div>{filteredBranches.length ? <div className="max-w-full overflow-x-auto"><Table className="min-w-[1180px]"><TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"><TableRow>{["Branch", "Contact", "Address", "Time Zone", "Status", "Actions"].map((heading) => <TableCell key={heading} isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">{heading}</TableCell>)}</TableRow></TableHeader><TableBody className="divide-y divide-gray-100 dark:divide-gray-800">{filteredBranches.map((branch) => <TableRow key={branch.id}><TableCell className="px-5 py-4"><div className="flex items-center gap-2"><span className="font-medium text-gray-800 dark:text-white/90">{branch.name}</span>{branch.isMain && <Badge size="sm" color="primary">Main Branch</Badge>}</div><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{branch.code}</p></TableCell><TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400"><p>{branch.phone}</p><p className="mt-1">{branch.email}</p></TableCell><TableCell className="max-w-xs px-5 py-4 text-sm text-gray-500 dark:text-gray-400"><p className="truncate">{branch.address}</p>{branch.googleMapsUrl && <a href={branch.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-500 hover:text-brand-600">Open in Google Maps</a>}</TableCell><TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{branch.timeZone}</TableCell><TableCell className="px-5 py-4"><Badge size="sm" color={branch.status === "Active" ? "success" : branch.status === "Inactive" ? "warning" : "light"}>{branch.status}</Badge>{branch.status === "Archived" && <p className="mt-1 text-xs text-gray-400">Bookings disabled</p>}</TableCell><TableCell className="px-5 py-4"><div className="flex items-center gap-2"><ActionButton label="Edit" onClick={() => openEdit(branch)}><PencilIcon /></ActionButton><button type="button" onClick={() => setRenameTarget(branch)} className="rounded-lg px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5">Rename</button><ActionButton label="Archive" disabled={branch.isMain || branch.status === "Archived"} onClick={() => setActionTarget({ branch, action: "archive" })}><ArchiveIcon /></ActionButton><ActionButton label="Delete" disabled={branch.isMain} danger onClick={() => setActionTarget({ branch, action: "delete" })}><TrashBinIcon /></ActionButton></div></TableCell></TableRow>)}</TableBody></Table></div> : <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><h3 className="font-medium text-gray-800 dark:text-white/90">{branches.length ? "No matching branches" : "No branches yet"}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{branches.length ? "Try a different search." : "Add your first branch to get started."}</p>{!branches.length && <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd} className="mt-4">Add Branch</Button>}</div>}</div><BranchFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} branch={editBranch} options={options} /><RenameBranchModal branch={renameTarget} onClose={() => setRenameTarget(null)} onSaved={refresh} /><Modal isOpen={!!actionTarget} onClose={() => { setActionTarget(null); setError(""); }} className="m-4 max-w-lg p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">{actionTarget?.action === "archive" ? "Archive branch?" : "Delete branch?"}</h2><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{actionTarget?.action === "archive" ? "Archived branches cannot receive new appointments." : "This permanently removes the branch. The main branch can never be deleted."}</p>{error && <p className="mt-3 text-sm text-error-500">{error}</p>}<div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={() => setActionTarget(null)}>Cancel</Button><Button size="sm" onClick={performAction} disabled={isWorking}>{isWorking ? "Working..." : actionTarget?.action === "archive" ? "Archive" : "Delete"}</Button></div></Modal></div>;
}

function ActionButton({ label, onClick, disabled = false, danger = false, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) { return <button type="button" aria-label={`${label} branch`} title={disabled ? (label === "Delete" ? "The main branch cannot be deleted" : "The main branch cannot be archived") : label} disabled={disabled} onClick={onClick} className={`inline-flex size-9 items-center justify-center overflow-visible rounded-lg border border-gray-200 bg-white leading-none transition disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-700 dark:bg-gray-900 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:overflow-visible ${danger ? "text-error-500 hover:border-error-200 hover:bg-error-50" : "text-gray-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-500"}`}>{children}</button>; }
