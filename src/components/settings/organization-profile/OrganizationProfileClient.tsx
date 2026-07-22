"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import FileInput from "@/components/form/input/FileInput";
import Input from "@/components/form/input/InputField";
import EmailInput from "@/components/form/input/EmailInput";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import TextArea from "@/components/form/input/TextArea";
import Switch from "@/components/form/switch/Switch";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { CopyIcon, DownloadIcon, TrashBinIcon } from "@/icons";
import {
  buildPublicBookingUrl,
  deleteOrganization,
  formatStorageSize,
  OrganizationValidationError,
  updateOrganizationDetails,
  updatePublicBooking,
  validateBookingSlug,
  verifyOrganizationEmail,
} from "@/services/organization.service";
import type { Organization, OrganizationDetails, OrganizationLogo, OrganizationProfileOptions, PublicBookingSettings } from "@/types/organization";

export default function OrganizationProfileClient({ initialOrganization, options }: { initialOrganization: Organization; options: OrganizationProfileOptions }) {
  const [savedDetails, setSavedDetails] = useState(initialOrganization.details);
  const [details, setDetails] = useState<OrganizationDetails>(initialOrganization.details);
  const [savedBooking, setSavedBooking] = useState(initialOrganization.publicBooking);
  const [booking, setBooking] = useState<PublicBookingSettings>(initialOrganization.publicBooking);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [deleted, setDeleted] = useState(initialOrganization.status === "Deleted");

  const detailsDirty = JSON.stringify(details) !== JSON.stringify(savedDetails);
  const bookingDirty = JSON.stringify(booking) !== JSON.stringify(savedBooking);
  const hasUnsavedChanges = detailsDirty || bookingDirty;
  const bookingUrl = buildPublicBookingUrl(booking);
  const slugError = booking.slug ? validateBookingSlug(booking.slug) : "Booking slug is required.";

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  const showNotice = (message: string) => { setNotice(message); setErrors({}); };
  const showError = (error: unknown) => {
    if (error instanceof OrganizationValidationError) setErrors(error.fieldErrors);
    else setErrors({ form: error instanceof Error ? error.message : "The organization could not be updated." });
    setNotice("");
  };

  const saveDetails = async () => {
    setIsSaving(true);
    try {
      const updated = await updateOrganizationDetails(details);
      setDetails(updated); setSavedDetails(updated); showNotice("Organization details saved.");
    } catch (error) { showError(error); }
    finally { setIsSaving(false); }
  };

  const verifyEmail = async () => {
    if (details.businessEmail !== savedDetails.businessEmail) {
      setErrors({ businessEmail: "Save the new business email before requesting verification." });
      return;
    }
    try {
      await verifyOrganizationEmail();
      const updated = { ...details, emailVerified: true };
      setDetails(updated); setSavedDetails(updated); showNotice("Business email verified for this mock workflow.");
    } catch (error) { showError(error); }
  };

  const saveBooking = async () => {
    setIsSaving(true);
    try {
      const updated = await updatePublicBooking(booking);
      setBooking(updated); setSavedBooking(updated); showNotice("Public booking settings saved.");
    } catch (error) { showError(error); }
    finally { setIsSaving(false); }
  };

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErrors({ logo: "Choose a PNG, JPG or WebP image." }); return; }
    if (file.size > 2 * 1024 * 1024) { setErrors({ logo: "Logo must be 2 MB or smaller." }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const logo: OrganizationLogo = { fileName: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl: reader.result };
      setDetails((current) => ({ ...current, logo })); setErrors({});
    };
    reader.readAsDataURL(file);
  };

  const copyBookingLink = async () => {
    try { await navigator.clipboard.writeText(bookingUrl); showNotice("Booking link copied."); }
    catch { setErrors({ form: "The booking link could not be copied. Copy it manually from the preview." }); }
  };

  const confirmDelete = async () => {
    try {
      await deleteOrganization(confirmationName);
      setDeleted(true); setDeleteOpen(false); setConfirmationName(""); showNotice("Organization deleted in the mock data service.");
    } catch (error) { showError(error); }
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">Organization Profile</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your organization and public booking presence.</p></div>{hasUnsavedChanges && <Badge color="warning">Unsaved changes</Badge>}</div>
      {notice && <div role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">{notice}</div>}
      {errors.form && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{errors.form}</div>}

      <section aria-labelledby="organization-details-heading"><ComponentCard title="Organization Details" desc="Your organization name, contact information and region." headerClassName="px-4 py-4 sm:px-6" bodyClassName="p-4 sm:p-6" contentClassName="space-y-5"><div className="grid gap-5 lg:grid-cols-[180px_1fr]"><div><Label>Organization Logo</Label><div className="mb-3 flex size-24 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-2xl font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800">{details.logo ? <Image src={details.logo.dataUrl} alt="Organization logo preview" width={96} height={96} unoptimized className="h-full w-full object-cover" /> : details.name.charAt(0).toUpperCase()}</div><FileInput accept="image/png,image/jpeg,image/webp" onChange={(event) => handleLogo(event.target.files?.[0])} className="text-xs" />{details.logo && <button type="button" onClick={() => setDetails((current) => ({ ...current, logo: undefined }))} className="mt-2 text-xs font-medium text-error-500 hover:text-error-600">Remove logo</button>}{errors.logo && <FieldError>{errors.logo}</FieldError>}<p className="mt-1 text-xs text-gray-400">PNG, JPG or WebP. Maximum 2 MB.</p></div><div className="grid gap-4 md:grid-cols-2"><ProfileField label="Organization Name" error={errors.name} className="md:col-span-2"><Input value={details.name} error={!!errors.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} /></ProfileField><ProfileField label="Business Email" error={errors.businessEmail}><div className="space-y-2"><EmailInput value={details.businessEmail} error={!!errors.businessEmail} onChange={(event) => setDetails({ ...details, businessEmail: event.target.value, emailVerified: false })} /><div className="flex items-center justify-between gap-2"><Badge size="sm" color={details.emailVerified ? "success" : "warning"}>{details.emailVerified ? "Verified" : "Unverified"}</Badge>{!details.emailVerified && <Button size="sm" variant="outline" onClick={verifyEmail} className="!min-h-9 !px-3 !py-1.5">Verify Email</Button>}</div></div></ProfileField><ProfileField label="Business Phone" error={errors.businessPhone}><PhoneInput value={details.businessPhone} error={!!errors.businessPhone} onChange={(businessPhone) => setDetails({ ...details, businessPhone })} /></ProfileField><ProfileField label="Country" error={errors.country}><Select key={details.country} options={options.countries} defaultValue={details.country} onChange={(country) => setDetails({ ...details, country })} /></ProfileField><ProfileField label="Currency" error={errors.currency}><Select key={details.currency} options={options.currencies} defaultValue={details.currency} onChange={(currency) => setDetails({ ...details, currency })} /></ProfileField><ProfileField label="Time Zone" error={errors.timeZone} className="md:col-span-2"><Select key={details.timeZone} options={options.timeZones} defaultValue={details.timeZone} onChange={(timeZone) => setDetails({ ...details, timeZone })} /></ProfileField><ProfileField label="Address (optional)" className="md:col-span-2"><TextArea rows={2} value={details.address} onChange={(address) => setDetails({ ...details, address })} placeholder="Business address" /></ProfileField><ProfileField label="Website (optional)" error={errors.website} className="md:col-span-2"><Input value={details.website} error={!!errors.website} onChange={(event) => setDetails({ ...details, website: event.target.value })} placeholder="https://example.com" /></ProfileField></div></div><div className="flex justify-end"><Button size="sm" onClick={saveDetails} disabled={isSaving || !detailsDirty}>{isSaving ? "Saving..." : "Save Changes"}</Button></div></ComponentCard></section>

      <section aria-labelledby="public-booking-heading"><ComponentCard title="Public Booking" desc="Control the link customers use to book online." headerClassName="px-4 py-4 sm:px-6" bodyClassName="p-4 sm:p-6" contentClassName="space-y-5"><ProfileField label="Booking URL Slug" error={errors.slug || (booking.slug && slugError ? slugError : undefined)}><div className="flex"><span className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">/book/</span><Input value={booking.slug} error={Boolean(slugError)} onChange={(event) => setBooking({ ...booking, slug: event.target.value.toLowerCase() })} className="rounded-l-none" /></div></ProfileField><div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"><div><p className="text-sm font-medium text-gray-800 dark:text-white/90">Public Booking Enabled</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Allow customers to book from the public page.</p></div><Switch label="" checked={booking.enabled} onChange={(enabled) => setBooking({ ...booking, enabled })} /></div><div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"><a href={bookingUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-medium text-brand-500 hover:text-brand-600">{bookingUrl}</a><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" startIcon={<CopyIcon />} onClick={copyBookingLink}>Copy Link</Button><a href={bookingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"><DownloadIcon className="size-5 -rotate-90" />Open Page</a></div></div><div className="flex justify-end"><Button size="sm" onClick={saveBooking} disabled={isSaving || Boolean(slugError) || !bookingDirty}>{isSaving ? "Saving..." : "Save Public Booking"}</Button></div></ComponentCard></section>

      <StorageSection organization={initialOrganization} />

      <section aria-labelledby="danger-zone-heading"><ComponentCard title="Danger Zone" desc="Irreversible actions. Please be certain before continuing." className="border-error-200 dark:border-error-500/30" headerClassName="px-4 py-4 sm:px-6" bodyClassName="p-4 sm:p-6" contentClassName="space-y-3"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-gray-800 dark:text-white/90">Delete Organization</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Permanently remove this organization and its data. This cannot be undone.</p></div><Button size="sm" variant="outline" startIcon={<TrashBinIcon />} onClick={() => setDeleteOpen(true)} disabled={deleted} className="text-error-500 ring-error-300 hover:bg-error-50 dark:text-error-400 dark:ring-error-500/40">{deleted ? "Organization Deleted" : "Delete Organization"}</Button></div></ComponentCard></section>

      <Modal isOpen={deleteOpen} onClose={() => { setDeleteOpen(false); setConfirmationName(""); setErrors({}); }} className="m-4 max-w-lg p-6 sm:p-8"><h3 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Delete Organization</h3><p className="mt-3 text-sm text-gray-500 dark:text-gray-400">This action cannot be undone. All organization data will be permanently deleted.</p><div className="mt-5"><Label>Type <strong>{details.name}</strong> to confirm</Label><Input value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} error={!!errors.confirmationName} autoComplete="off" />{errors.confirmationName && <FieldError>{errors.confirmationName}</FieldError>}</div><div className="mt-6 flex justify-end gap-3"><Button size="sm" variant="outline" onClick={() => { setDeleteOpen(false); setConfirmationName(""); }}>Cancel</Button><Button size="sm" onClick={confirmDelete} disabled={confirmationName !== details.name} startIcon={<TrashBinIcon />} className="bg-error-500 hover:bg-error-600 disabled:bg-error-300">Delete Permanently</Button></div></Modal>
    </div>
  );
}

function StorageSection({ organization }: { organization: Organization }) {
  const percent = useMemo(() => Math.min(100, organization.storage.limitBytes ? (organization.storage.usedBytes / organization.storage.limitBytes) * 100 : 0), [organization.storage]);
  return <section aria-labelledby="storage-usage-heading"><ComponentCard title="Storage Usage" desc="Space used by logos, receipts and uploaded images." headerClassName="px-4 py-4 sm:px-6" bodyClassName="p-4 sm:p-6" contentClassName="space-y-3"><div className="flex justify-between gap-4 text-sm"><span className="font-medium text-gray-800 dark:text-white/90">{formatStorageSize(organization.storage.usedBytes)} used</span><span className="text-gray-500 dark:text-gray-400">{formatStorageSize(organization.storage.limitBytes)} limit</span></div><div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${percent}%` }} /></div><div className="flex justify-between gap-4 text-xs text-gray-500 dark:text-gray-400"><span>{organization.storage.uploadedFileCount} uploaded files</span><span>{percent.toFixed(1)}% used</span></div><p className="text-xs text-gray-400">Storage values are provided by the shared organization service and are ready for Supabase Storage usage data.</p></ComponentCard></section>;
}

function ProfileField({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label>{label}</Label>{children}{error && <FieldError>{error}</FieldError>}</div>; }
function FieldError({ children }: { children: React.ReactNode }) { return <p className="mt-1.5 text-xs text-error-500">{children}</p>; }
