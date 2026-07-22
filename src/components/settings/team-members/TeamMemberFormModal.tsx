"use client";

import { useState } from "react";
import Input from "@/components/form/input/InputField";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { inviteTeamMember, TeamMemberValidationError } from "@/services/team-members.service";
import { teamMemberRoles, type TeamMemberFieldErrors, type TeamMemberInput } from "@/types/team-members";
import type { Branch } from "@/types/branches";
import type { Service } from "@/types/services";

export default function TeamMemberFormModal({ isOpen, onClose, branches, services, onInvited }: { isOpen: boolean; onClose: () => void; branches: Branch[]; services: Service[]; onInvited: (message: string) => void }) {
  const initial: TeamMemberInput = { fullName: "", email: "", phone: "", role: "Staff", branchId: branches.find((item) => item.status === "Active")?.id ?? "", serviceIds: [], status: "Invited" };
  const [form, setForm] = useState(initial); const [errors, setErrors] = useState<TeamMemberFieldErrors>({}); const [saving, setSaving] = useState(false);
  const set = <K extends keyof TeamMemberInput>(key: K, value: TeamMemberInput[K]) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined, form: undefined })); };
  const close = () => { setForm(initial); setErrors({}); onClose(); };
  const submit = async () => { setSaving(true); try { const member = await inviteTeamMember(form); onInvited(`Invitation simulated successfully for ${member.email}.`); close(); } catch (error) { if (error instanceof TeamMemberValidationError) setErrors(error.fieldErrors); else setErrors({ form: error instanceof Error ? error.message : "The invitation could not be sent." }); } finally { setSaving(false); } };

  return <Modal isOpen={isOpen} onClose={close} className="m-4 max-w-2xl p-6 sm:p-8"><h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Add Team Member</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Weâ€™ll simulate an email invitation. Password setup will be handled by the invite flow.</p>{errors.form && <Feedback error>{errors.form}</Feedback>}<div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Full Name" error={errors.fullName}><Input value={form.fullName} error={!!errors.fullName} onChange={(event) => set("fullName", event.target.value)} autoComplete="name" /></Field><Field label="Email" error={errors.email}><EmailInput value={form.email} error={!!errors.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" /></Field><Field label="Phone" error={errors.phone}><PhoneInput value={form.phone} error={!!errors.phone} onChange={(phone) => set("phone", phone)} placeholder="0000 0000" autoComplete="tel" /></Field><Field label="Role" error={errors.role}><Select key={form.role} options={teamMemberRoles.map((role) => ({ value: role, label: role }))} defaultValue={form.role} onChange={(value) => set("role", value as TeamMemberInput["role"])} /></Field><Field label="Branch" error={errors.branchId}><Select key={form.branchId} options={branches.filter((branch) => branch.status === "Active").map((branch) => ({ value: branch.id, label: branch.name }))} defaultValue={form.branchId} onChange={(value) => set("branchId", value)} placeholder="Select branch" /></Field><Field label="Status"><Select key={form.status} options={[{ value: "Invited", label: "Invited" }, { value: "Active", label: "Active" }]} defaultValue={form.status} onChange={(value) => set("status", value as TeamMemberInput["status"])} /></Field><div className="sm:col-span-2"><MultiSelect key={form.serviceIds.join("|")} label="Assigned Services" options={services.filter((service) => service.isActive).map((service) => ({ value: service.id, text: service.name, selected: form.serviceIds.includes(service.id) }))} defaultSelected={form.serviceIds} onChange={(value) => set("serviceIds", value)} /></div></div><div className="mt-6 flex justify-end gap-3"><Button variant="outline" size="sm" onClick={close}>Cancel</Button><Button size="sm" onClick={submit} disabled={saving}>{saving ? "Sending..." : "Send Invitation"}</Button></div></Modal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div><Label>{label}</Label>{children}{error && <p className="mt-1 text-xs text-error-500">{error}</p>}</div>; }
function Feedback({ error = false, children }: { error?: boolean; children: React.ReactNode }) { return <div role={error ? "alert" : "status"} className={`mt-4 rounded-lg border px-4 py-3 text-sm ${error ? "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400" : "border-success-200 bg-success-50 text-success-700"}`}>{children}</div>; }
