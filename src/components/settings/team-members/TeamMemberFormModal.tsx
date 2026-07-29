"use client";

import { useState } from "react";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { createTeamMember, TeamMemberValidationError } from "@/services/team-members.service";
import {
  teamMemberRoles,
  type TeamMemberCreateInput,
  type TeamMemberFieldErrors,
} from "@/types/team-members";
import type { Branch } from "@/types/branches";
import type { Service } from "@/types/services";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  services: Service[];
  onCreated: (message: string) => void;
};

export default function TeamMemberFormModal({
  isOpen,
  onClose,
  branches,
  services,
  onCreated,
}: Props) {
  const initial = createInitial(branches);
  const [form, setForm] = useState<TeamMemberCreateInput>(initial);
  const [errors, setErrors] = useState<TeamMemberFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const set = <K extends keyof TeamMemberCreateInput>(
    key: K,
    value: TeamMemberCreateInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  const close = () => {
    setForm(createInitial(branches));
    setErrors({});
    setInviteLink("");
    onClose();
  };

  const submit = async () => {
    setSaving(true);
    try {
      const result = await createTeamMember(form);
      setInviteLink(result.inviteLink);
      onCreated(`${result.member.fullName} was invited. Copy and share the secure invitation link.`);
    } catch (error) {
      if (error instanceof TeamMemberValidationError) {
        setErrors(error.fieldErrors);
      } else {
        setErrors({
          form: error instanceof Error ? error.message : "The team member account could not be created.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} className="m-4 max-h-[90vh] max-w-2xl overflow-y-auto p-6 sm:p-8">
      <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
        Add Team Member
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Generate a secure Supabase invitation link to share with the team member.
      </p>

      {errors.form && <Feedback>{errors.form}</Feedback>}
      {inviteLink && (
        <div className="mt-5 rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-500/25 dark:bg-success-500/10">
          <p className="text-sm font-medium text-success-700 dark:text-success-400">Invitation created</p>
          <p className="mt-1 text-xs text-success-600 dark:text-success-400/80">Copy this one-time link and share it securely. No paid email service was used.</p>
          <div className="mt-3 flex gap-2">
            <Input value={inviteLink} readOnly ariaLabel="Invitation link" />
            <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(inviteLink)}>Copy</Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" required error={errors.fullName}>
          <Input
            value={form.fullName}
            error={!!errors.fullName}
            onChange={(event) => set("fullName", event.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field label="Email" required error={errors.email}>
          <EmailInput
            value={form.email}
            error={!!errors.email}
            onChange={(event) => set("email", event.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <PhoneInput
            value={form.phone}
            error={!!errors.phone}
            onChange={(phone) => set("phone", phone)}
            placeholder="0000 0000"
            autoComplete="tel"
          />
        </Field>
        <Field label="Role" required error={errors.role}>
          <Select
            key={form.role}
            options={teamMemberRoles.map((role) => ({ value: role, label: role }))}
            defaultValue={form.role}
            onChange={(value) => set("role", value as TeamMemberCreateInput["role"])}
          />
        </Field>
        <Field label="Branch" required error={errors.branchId}>
          <Select
            key={form.branchId}
            options={branches
              .filter((branch) => branch.status === "Active")
              .map((branch) => ({ value: branch.id, label: branch.name }))}
            defaultValue={form.branchId}
            onChange={(value) => set("branchId", value)}
            placeholder="Select branch"
          />
        </Field>
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-500/25 dark:bg-brand-500/10">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-400">Invitation required</p>
          <p className="mt-1 text-xs text-brand-600 dark:text-brand-400/80">
            Access becomes active after the team member accepts the secure link.
          </p>
        </div>
        <div className="sm:col-span-2">
          <MultiSelect
            key={form.serviceIds.join("|")}
            label="Assigned Services"
            options={services
              .filter((service) => service.isActive)
              .map((service) => ({
                value: service.id,
                text: service.name,
                selected: form.serviceIds.includes(service.id),
              }))}
            defaultSelected={form.serviceIds}
            onChange={(value) => set("serviceIds", value)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={close}>{inviteLink ? "Done" : "Cancel"}</Button>
        {!inviteLink && <Button size="sm" onClick={submit} disabled={saving}>{saving ? "Creating..." : "Generate Invitation"}</Button>}
      </div>
    </Modal>
  );
}

function createInitial(branches: Branch[]): TeamMemberCreateInput {
  return {
    fullName: "",
    email: "",
    phone: "",
    role: "Staff",
    branchId: branches.find((item) => item.status === "Active")?.id ?? "",
    serviceIds: [],
    status: "Invited",
  };
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}{required && <span className="text-error-500"> *</span>}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}

function Feedback({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
      {children}
    </div>
  );
}
