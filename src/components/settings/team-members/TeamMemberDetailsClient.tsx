"use client";

import Link from "@/components/common/ReturnAwareLink";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BookingToast, { type BookingToastMessage } from "@/components/appointments/BookingToast";
import Checkbox from "@/components/form/input/Checkbox";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  AlertIcon,
  BoxIcon,
  CalenderIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  CopyIcon,
  DollarLineIcon,
  EyeCloseIcon,
  EyeIcon,
  GroupIcon,
  LockIcon,
  PieChartIcon,
  PlugInIcon,
  TrashBinIcon,
  UserIcon,
} from "@/icons";
import { createDefaultPermissions, permissionsFor } from "@/lib/team-member-permissions";
import {
  getTeamMemberById,
  removeTeamMember,
  resetTeamMemberPassword,
  subscribeToTeamMembers,
  TeamMemberValidationError,
  updateTeamMember,
  updateTeamMemberPhoto,
} from "@/services/team-members.service";
import {
  permissionActions,
  teamMemberRoles,
  type PermissionAction,
  type PermissionModule,
  type PermissionSet,
  type TeamMember,
  type TeamMemberFieldErrors,
  type TeamMemberInput,
  type TeamMemberRole,
} from "@/types/team-members";
import type { Branch } from "@/types/branches";
import type { Service } from "@/types/services";
import TeamMemberAvatar from "./TeamMemberAvatar";

const permissionGroups: {
  title: string;
  description: string;
  modules: PermissionModule[];
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { title: "Appointments", description: "Bookings, calendar, and appointment activity", modules: ["Appointments", "Calendar"], icon: CalenderIcon },
  { title: "Customers", description: "Customer records, profiles, and invoices", modules: ["Customers", "Invoices"], icon: UserIcon },
  { title: "Services & Catalog", description: "Services, categories, and packages", modules: ["Services", "Packages"], icon: BoxIcon },
  { title: "Staff", description: "Team members and staff access", modules: ["Team Members"], icon: GroupIcon },
  { title: "Reports", description: "Dashboard and business reporting", modules: ["Dashboard", "Reports"], icon: PieChartIcon },
  { title: "Expenses", description: "Expense records and financial entries", modules: ["Expenses"], icon: DollarLineIcon },
  { title: "Settings", description: "Business and system configuration", modules: ["Settings"], icon: PlugInIcon },
];

type Preset = "Staff" | "Manager" | "Admin" | "Custom";

export default function TeamMemberDetailsClient({
  memberId,
  initialMember,
  branches,
  services,
}: {
  memberId: string;
  initialMember: TeamMember | null;
  branches: Branch[];
  services: Service[];
}) {
  const router = useRouter();
  const [member, setMember] = useState(initialMember);
  const [form, setForm] = useState<TeamMemberInput | null>(initialMember ? toInput(initialMember) : null);
  const [errors, setErrors] = useState<TeamMemberFieldErrors>({});
  const [loading, setLoading] = useState(!initialMember);
  const [saving, setSaving] = useState(false);
  const [preset, setPreset] = useState<Preset>(presetForRole(initialMember?.role));
  const [resetOpen, setResetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState<BookingToastMessage | null>(null);

  useEffect(() => {
    const refresh = () => {
      setLoading(true);
      getTeamMemberById(memberId)
        .then((next) => {
          setMember(next);
          setForm(next ? toInput(next) : null);
          setPreset(presetForRole(next?.role));
        })
        .catch(() => setErrors({ form: "The team member could not be loaded." }))
        .finally(() => setLoading(false));
    };
    if (!initialMember) refresh();
    return subscribeToTeamMembers(() => {
      getTeamMemberById(memberId).then((next) => {
        if (next) setMember(next);
      });
    });
  }, [initialMember, memberId]);

  const isOwner = member?.role === "Owner";
  const displayedPermissions = useMemo(
    () => member && form
      ? permissionsFor({ role: form.role, permissions: form.permissions ?? member.permissions })
      : null,
    [member, form],
  );
  const grantedCount = displayedPermissions ? countPermissions(displayedPermissions) : 0;
  const totalPermissions = permissionGroups.reduce(
    (total, group) => total + group.modules.length * permissionActions.length,
    0,
  );

  const set = <K extends keyof TeamMemberInput>(key: K, value: TeamMemberInput[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  const setPermissions = (permissions: PermissionSet, nextPreset: Preset = "Custom") => {
    if (!form || form.role === "Owner") return;
    set("permissions", permissions);
    setPreset(nextPreset);
  };

  const setPermission = (
    module: PermissionModule,
    action: PermissionAction,
    checked: boolean,
  ) => {
    if (!displayedPermissions) return;
    setPermissions({
      ...displayedPermissions,
      [module]: { ...displayedPermissions[module], [action]: checked },
    });
  };

  const applyPreset = (nextPreset: Preset) => {
    if (!form || isOwner || nextPreset === "Custom") {
      setPreset("Custom");
      return;
    }
    set("role", nextPreset as TeamMemberRole);
    setPermissions(createPresetPermissions(nextPreset), nextPreset);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await updateTeamMember(memberId, form);
      setMember(updated);
      setForm(toInput(updated));
      setErrors({});
      showToast("success", "Changes saved", `${updated.fullName}'s profile and permissions were updated.`);
    } catch (error) {
      if (error instanceof TeamMemberValidationError) {
        setErrors(error.fieldErrors);
        showToast("error", "Could not save changes", firstError(error.fieldErrors));
      } else {
        const message = error instanceof Error ? error.message : "Changes could not be saved.";
        setErrors({ form: message });
        showToast("error", "Could not save changes", message);
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      showToast("error", "Photo not uploaded", "Choose a PNG, JPG, or WebP image up to 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      updateTeamMemberPhoto(memberId, reader.result)
        .then((updated) => {
          setMember(updated);
          showToast("success", "Profile photo updated", "The new photo is now shown on this team member's profile.");
        })
        .catch((error) =>
          showToast("error", "Photo not uploaded", error instanceof Error ? error.message : "Try again."),
        );
    };
    reader.readAsDataURL(file);
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await removeTeamMember(memberId);
      router.push("/settings/team-members");
    } catch (error) {
      setRemoveOpen(false);
      showToast("error", "Team member not removed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setRemoving(false);
    }
  };

  const showToast = (
    type: BookingToastMessage["type"],
    title: string,
    message: string,
  ) => setToast({ id: Date.now(), type, title, message });

  if (loading) return <DetailsLoading />;
  if (!member || !form || !displayedPermissions) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-white/[0.02]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Team member not found</h1>
        <Button href="/settings/team-members" variant="outline" size="sm" className="mt-5">Back to Team Members</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {toast && <BookingToast key={toast.id} toast={toast} onClose={() => setToast(null)} />}

      <Link
        href="/settings/team-members"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-500 dark:text-gray-400"
      >
        <ChevronLeftIcon className="size-5" />
        Team Members
      </Link>

      <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 bg-brand-50/70 px-5 py-6 text-center dark:border-gray-800 dark:bg-brand-500/10">
              <TeamMemberAvatar name={form.fullName || member.fullName} photoUrl={member.photoUrl} className="size-20 text-xl" />
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-600 shadow-theme-xs transition hover:bg-brand-50 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500/10">
                Upload photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => uploadPhoto(event.target.files?.[0])}
                />
              </label>
              <p className="mt-2 text-xs text-gray-400">PNG, JPG, WebP. Max 3 MB.</p>
              <h1 className="mt-3 text-xl font-semibold text-gray-800 dark:text-white/90">{form.fullName || member.fullName}</h1>
              <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">{form.email}</p>
            </div>

            <div className="space-y-4 p-5">
              <Field label="Full Name" required error={errors.fullName}>
                <Input value={form.fullName} error={!!errors.fullName} onChange={(event) => set("fullName", event.target.value)} />
              </Field>
              <Field label="Phone Number" error={errors.phone}>
                <PhoneInput value={form.phone} error={!!errors.phone} onChange={(phone) => set("phone", phone)} />
              </Field>
              <Field label="Email Address" required error={errors.email}>
                <EmailInput value={form.email} error={!!errors.email} onChange={(event) => set("email", event.target.value)} />
              </Field>
              <Field label="Role" error={errors.role}>
                <Select
                  key={form.role}
                  options={teamMemberRoles.map((role) => ({ value: role, label: role }))}
                  defaultValue={form.role}
                  onChange={(value) => {
                    set("role", value as TeamMemberInput["role"]);
                    setPreset(presetForRole(value as TeamMemberRole));
                  }}
                />
              </Field>
              <Field label="Branch" error={errors.branchId}>
                <Select
                  key={form.branchId}
                  options={branches
                    .filter((branch) => branch.status !== "Archived")
                    .map((branch) => ({ value: branch.id, label: branch.name }))}
                  defaultValue={form.branchId}
                  onChange={(value) => set("branchId", value)}
                />
              </Field>
              <div className={`rounded-xl border border-gray-200 p-4 dark:border-gray-700 ${isOwner ? "bg-gray-50 dark:bg-gray-800/50" : ""}`}>
                <Switch
                  label={form.status === "Active" ? "Active" : "Inactive"}
                  checked={form.status === "Active"}
                  disabled={isOwner}
                  onChange={(checked) => set("status", checked ? "Active" : "Inactive")}
                />
                <p className="mt-1 pl-14 text-xs text-gray-500 dark:text-gray-400">
                  {isOwner
                    ? "Owners cannot be deactivated."
                    : form.status === "Active"
                      ? "Can sign in and receive appointments."
                      : "Cannot sign in or receive appointments."}
                </p>
              </div>
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
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                <LockIcon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white/90">Login credentials</h2>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                  Passwords are securely one-way hashed. Existing passwords are never displayed.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 w-full"
              startIcon={<LockIcon className="size-4" />}
              onClick={() => setResetOpen(true)}
            >
              Reset Password
            </Button>
          </section>

          <button
            type="button"
            disabled={isOwner}
            onClick={() => setRemoveOpen(true)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-error-200 bg-white px-4 text-sm font-medium text-error-600 transition hover:border-error-400 hover:bg-error-50 hover:shadow-[0_0_18px_rgba(240,68,56,0.2)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-error-500/30 dark:bg-white/[0.03] dark:text-error-400 dark:hover:bg-error-500/10 dark:hover:shadow-[0_0_18px_rgba(240,68,56,0.25)]"
          >
            <TrashBinIcon className="size-4" />
            Remove from team
          </button>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">Permissions</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Control what {form.fullName || member.fullName} can do — {grantedCount} of {totalPermissions} granted.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isOwner}
                onClick={() => setPermissions(createDefaultPermissions(true), "Custom")}
              >
                Enable All
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isOwner}
                onClick={() => setPermissions(createDefaultPermissions(false), "Custom")}
              >
                Disable All
              </Button>
            </div>
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Start from a role preset</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["Staff", "Manager", "Admin", "Custom"] as Preset[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={isOwner}
                  onClick={() => applyPreset(item)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    preset === item
                      ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs"
                      : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {isOwner && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Owner permissions are protected and always enabled.</p>}
          </section>

          {permissionGroups.map((group) => (
            <PermissionGroupCard
              key={group.title}
              group={group}
              permissions={displayedPermissions}
              disabled={isOwner}
              onChange={setPermission}
            />
          ))}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(16,24,40,0.08)] backdrop-blur lg:left-[290px] dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            <span className="text-brand-500">{grantedCount}</span> of {totalPermissions} permissions granted
          </p>
          <div className="flex justify-end gap-3">
            <Button href="/settings/team-members" size="sm" variant="outline">Cancel</Button>
            <Button size="sm" startIcon={<CheckCircleIcon />} onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <ResetPasswordModal
        isOpen={resetOpen}
        memberId={memberId}
        memberName={member.fullName}
        onClose={() => setResetOpen(false)}
        onSuccess={() =>
          showToast(
            "success",
            "Password updated",
            "The team member can now sign in using the new password.",
          )
        }
        onError={(message) => showToast("error", "Password not updated", message)}
      />

      <Modal isOpen={removeOpen} onClose={() => setRemoveOpen(false)} className="m-4 max-w-lg p-6 sm:p-8">
        <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Remove from team?</h2>
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          {member.fullName} will lose access immediately and will no longer be available for new appointments.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={remove} disabled={removing} className="!bg-error-600 hover:!bg-error-700">
            {removing ? "Removing..." : "Remove Team Member"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PermissionGroupCard({
  group,
  permissions,
  disabled,
  onChange,
}: {
  group: (typeof permissionGroups)[number];
  permissions: PermissionSet;
  disabled: boolean;
  onChange: (module: PermissionModule, action: PermissionAction, checked: boolean) => void;
}) {
  const entries = group.modules.flatMap((module) =>
    permissionActions.map((action) => ({ module, action })),
  );
  const granted = entries.filter(({ module, action }) => permissions[module][action]).length;
  const Icon = group.icon;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{group.title}</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
          </div>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {granted}/{entries.length}
        </span>
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {entries.map(({ module, action }) => (
          <div key={`${module}-${action}`} className="flex items-start gap-3">
            <Checkbox
              checked={permissions[module][action]}
              disabled={disabled}
              onChange={(checked) => onChange(module, action, checked)}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {permissionLabel(module, action)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {permissionDescription(module, action)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResetPasswordModal({
  isOpen,
  memberId,
  memberName,
  onClose,
  onSuccess,
  onError,
}: {
  isOpen: boolean;
  memberId: string;
  memberName: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<"generate" | "specific">("generate");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setMode("generate");
    setPassword("");
    setConfirmation("");
    setGeneratedPassword("");
    setShowPassword(false);
    setShowConfirmation(false);
    setError("");
    setCopied(false);
    onClose();
  };

  const submit = async () => {
    let nextPassword = password;
    if (mode === "generate") nextPassword = generateStrongPassword();
    if (nextPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "specific" && nextPassword !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await resetTeamMemberPassword(memberId, nextPassword);
      onSuccess();
      if (mode === "generate") {
        setGeneratedPassword(nextPassword);
      } else {
        close();
      }
    } catch (resetError) {
      const message = resetError instanceof TeamMemberValidationError
        ? resetError.fieldErrors.password ?? "The password could not be updated."
        : resetError instanceof Error
          ? resetError.message
          : "The password could not be updated.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
    } catch {
      setError("The password could not be copied. Select and copy it manually.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} className="m-4 max-w-xl p-6 sm:p-8">
      <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
        {generatedPassword ? "New password generated" : "Reset password"}
      </h2>
      {!generatedPassword && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The current password for {memberName} will stop working immediately.
        </p>
      )}

      {generatedPassword ? (
        <div className="mt-6 space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-warning-300 bg-warning-50 p-4 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
            <AlertIcon className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm leading-6">
              Copy this now and share it securely—through WhatsApp or in person.
              <strong className="ml-1 font-semibold">You won&apos;t see it again.</strong>
            </p>
          </div>

          <div>
            <Label>New password for {memberName}</Label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={generatedPassword}
                  readOnly
                  ariaLabel={`New password for ${memberName}`}
                  className="font-mono tracking-wider"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide generated password" : "Show generated password"}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
              >
                {showPassword ? <EyeCloseIcon className="size-5" /> : <EyeIcon className="size-5" />}
              </button>
              <button
                type="button"
                onClick={copy}
                aria-label="Copy generated password"
                title={copied ? "Copied" : "Copy password"}
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg border bg-white shadow-theme-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-gray-900 ${
                  copied
                    ? "border-success-300 text-success-600 dark:border-success-500/40 dark:text-success-400"
                    : "border-gray-300 text-gray-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                }`}
              >
                {copied ? <CheckCircleIcon className="size-5" /> : <CopyIcon className="size-5" />}
              </button>
            </div>
            {copied && <p role="status" className="mt-2 text-xs font-medium text-success-600 dark:text-success-400">Password copied.</p>}
          </div>

          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Their old password stopped working when you clicked reset. Ask them to sign in with this new password and change it from Settings after their first login.
          </p>

          <div className="flex justify-end">
            <Button size="sm" onClick={close}>I&apos;ve saved it — close</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            <PasswordOption
              checked={mode === "generate"}
              title="Generate a strong password"
              description="Create a secure password and show it to you once."
              onClick={() => { setMode("generate"); setError(""); }}
            />
            <PasswordOption
              checked={mode === "specific"}
              title="Set a specific password"
              description="Type a password to give to the team member directly."
              onClick={() => { setMode("specific"); setError(""); }}
            />
          </div>

          {mode === "specific" && (
            <div className="mt-4 space-y-3">
              <PasswordInput
                placeholder="New password (minimum 8 characters)"
                value={password}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                onChange={(value) => { setPassword(value); setError(""); }}
              />
              <PasswordInput
                placeholder="Confirm password"
                value={confirmation}
                visible={showConfirmation}
                onToggle={() => setShowConfirmation((current) => !current)}
                onChange={(value) => { setConfirmation(value); setError(""); }}
              />
            </div>
          )}

          {error && <p role="alert" className="mt-3 text-sm text-error-500">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={close}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving ? "Updating..." : mode === "generate" ? "Generate Password" : "Set Password"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function PasswordOption({
  checked,
  title,
  description,
  onClick,
}: {
  checked: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
        checked
          ? "border-brand-400 bg-brand-50/70 dark:border-brand-500/60 dark:bg-brand-500/10"
          : "border-gray-200 hover:border-brand-300 dark:border-gray-700"
      }`}
    >
      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${checked ? "border-brand-500" : "border-gray-300 dark:border-gray-600"}`}>
        {checked && <span className="size-2.5 rounded-full bg-brand-500" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{title}</span>
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
      </span>
    </button>
  );
}

function PasswordInput({
  placeholder,
  value,
  visible,
  onToggle,
  onChange,
}: {
  placeholder: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoComplete="new-password"
        onChange={(event) => onChange(event.target.value)}
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-gray-800"
      >
        {visible ? <EyeCloseIcon className="size-5" /> : <EyeIcon className="size-5" />}
      </button>
    </div>
  );
}

function createPresetPermissions(preset: Exclude<Preset, "Custom">): PermissionSet {
  const permissions = createDefaultPermissions(false);
  if (preset === "Admin") return createDefaultPermissions(true);

  permissionGroups.forEach((group) => {
    group.modules.forEach((module) => {
      permissionActions.forEach((action) => {
        if (preset === "Manager") {
          permissions[module][action] = module !== "Settings" || action === "view";
        } else {
          permissions[module][action] =
            action === "view" ||
            (["Appointments", "Calendar", "Customers"].includes(module) &&
              ["create", "edit"].includes(action));
        }
      });
    });
  });
  return permissions;
}

function permissionLabel(module: PermissionModule, action: PermissionAction) {
  const verbs = { view: "View", create: "Create", edit: "Edit", delete: "Delete" };
  return `${verbs[action]} ${module.toLowerCase()}`;
}

function permissionDescription(module: PermissionModule, action: PermissionAction) {
  const descriptions = {
    view: `See ${module.toLowerCase()} information`,
    create: `Add new ${module.toLowerCase()} records`,
    edit: `Update existing ${module.toLowerCase()} records`,
    delete: `Remove ${module.toLowerCase()} records`,
  };
  return descriptions[action];
}

function countPermissions(permissions: PermissionSet) {
  return permissionGroups.reduce(
    (total, group) =>
      total +
      group.modules.reduce(
        (groupTotal, module) =>
          groupTotal + permissionActions.filter((action) => permissions[module][action]).length,
        0,
      ),
    0,
  );
}

function presetForRole(role?: TeamMemberRole): Preset {
  return role === "Staff" || role === "Manager" || role === "Admin" ? role : "Custom";
}

function generateStrongPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%&*?";
  const all = uppercase + lowercase + numbers + symbols;
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  const required = [
    uppercase[values[0] % uppercase.length],
    lowercase[values[1] % lowercase.length],
    numbers[values[2] % numbers.length],
    symbols[values[3] % symbols.length],
  ];
  const rest = Array.from(values.slice(4), (value) => all[value % all.length]);
  const characters = [...required, ...rest];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = values[characters.length - index] % (index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

function firstError(errors: TeamMemberFieldErrors) {
  return Object.values(errors).find(Boolean) ?? "Check the highlighted fields and try again.";
}

const toInput = (member: TeamMember): TeamMemberInput => ({
  fullName: member.fullName,
  email: member.email,
  phone: member.phone,
  role: member.role,
  status: member.status,
  branchId: member.branchId,
  serviceIds: [...member.serviceIds],
  permissions: structuredClone(member.permissions),
});

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

function DetailsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="h-[760px] rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="space-y-5">
          <div className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
