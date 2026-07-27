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
import { EyeCloseIcon, EyeIcon } from "@/icons";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    setShowPassword(false);
    setShowConfirmation(false);
    onClose();
  };

  const submit = async () => {
    setSaving(true);
    try {
      const member = await createTeamMember(form);
      onCreated(`${member.fullName} can sign in immediately using the credentials you created.`);
      close();
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
        Create an active account and give the login credentials to the team member directly.
      </p>

      {errors.form && <Feedback>{errors.form}</Feedback>}

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
        <div className="rounded-xl border border-success-200 bg-success-50 px-4 py-3 dark:border-success-500/25 dark:bg-success-500/10">
          <p className="text-sm font-medium text-success-700 dark:text-success-400">Active immediately</p>
          <p className="mt-1 text-xs text-success-600 dark:text-success-400/80">
            The account can sign in as soon as it is created.
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

      <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
        <h3 className="font-semibold text-gray-800 dark:text-white/90">Login credentials</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Passwords require at least 8 characters and are never displayed again after creation.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PasswordField
            label="Password"
            value={form.password}
            visible={showPassword}
            error={errors.password}
            onToggle={() => setShowPassword((current) => !current)}
            onChange={(value) => set("password", value)}
          />
          <PasswordField
            label="Confirm Password"
            value={form.confirmPassword}
            visible={showConfirmation}
            error={errors.confirmPassword}
            onToggle={() => setShowConfirmation((current) => !current)}
            onChange={(value) => set("confirmPassword", value)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? "Creating..." : "Create Account"}
        </Button>
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
    status: "Active",
    password: "",
    confirmPassword: "",
  };
}

function PasswordField({
  label,
  value,
  visible,
  error,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  visible: boolean;
  error?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} required error={error}>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          error={!!error}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-gray-800"
        >
          {visible ? <EyeCloseIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
    </Field>
  );
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
