"use client";

import { useMemo, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Radio from "@/components/form/input/Radio";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import {
  AppointmentSettingsValidationError,
  calculateTax,
  getStaffSchedule,
  updateBusinessHours,
  updateGeneralAppointmentSettings,
  updateStaffSchedule,
  updateTaxVatSettings,
} from "@/services/appointment-settings.service";
import type { AppointmentSettings, ScheduleDay, StaffScheduleSettings, TaxVatSettings, VatType } from "@/types/appointment-settings";
import type { StaffMember } from "@/types/staff";
import ScheduleEditor from "./ScheduleEditor";

const tabs = ["General Settings", "Business Hours", "Staff Schedules", "Tax / VAT"] as const;
type Tab = (typeof tabs)[number];

export default function AppointmentSettingsClient({ initialSettings, staffMembers }: { initialSettings: AppointmentSettings; staffMembers: StaffMember[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("General Settings");
  const [general, setGeneral] = useState({ ...initialSettings.general });
  const [businessHours, setBusinessHours] = useState(initialSettings.businessHours.map((day) => ({ ...day })));
  const [tax, setTax] = useState({ ...initialSettings.tax });
  const [staffSchedule, setStaffSchedule] = useState<StaffScheduleSettings | null>(initialSettings.staffSchedules[0] ? cloneSchedule(initialSettings.staffSchedules[0]) : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  const runSave = async (action: () => Promise<unknown>, message: string) => {
    setIsSaving(true); setErrors({}); setNotice("");
    try { await action(); setNotice(message); }
    catch (error) {
      if (error instanceof AppointmentSettingsValidationError) setErrors(error.fieldErrors);
      else setErrors({ form: error instanceof Error ? error.message : "The settings could not be saved." });
    } finally { setIsSaving(false); }
  };

  const changeTab = (tab: Tab) => { setActiveTab(tab); setErrors({}); setNotice(""); };
  const loadStaff = async (staffId: string) => {
    setIsLoadingStaff(true); setErrors({}); setNotice("");
    try { setStaffSchedule(cloneSchedule(await getStaffSchedule(staffId))); }
    catch (error) { setErrors({ form: error instanceof Error ? error.message : "The schedule could not be loaded." }); }
    finally { setIsLoadingStaff(false); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">Appointment Settings</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage booking rules, availability and tax settings from one place.</p></div>
      <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-800"><div className="flex min-w-max gap-1">{tabs.map((tab) => <button key={tab} type="button" onClick={() => changeTab(tab)} className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"}`}>{tab}</button>)}</div></div>
      {notice && <div role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">{notice}</div>}
      {errors.form && <div role="alert" className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">{errors.form}</div>}

      {activeTab === "General Settings" && <GeneralPanel value={general} onChange={setGeneral} error={errors.cancellationNoticeValue} saving={isSaving} onSave={() => runSave(() => updateGeneralAppointmentSettings(general), "General appointment settings saved.")} />}
      {activeTab === "Business Hours" && <SchedulePanel title="Business hours" description="Set the hours customers can book appointments." days={businessHours} onChange={setBusinessHours} errors={errors} saving={isSaving} saveLabel="Save Hours" onSave={() => runSave(() => updateBusinessHours(businessHours), "Business hours saved.")} />}
      {activeTab === "Staff Schedules" && <StaffPanel staffMembers={staffMembers} schedule={staffSchedule} errors={errors} loading={isLoadingStaff} saving={isSaving} onSelect={loadStaff} onChange={setStaffSchedule} onSave={() => staffSchedule && runSave(() => updateStaffSchedule({ ...staffSchedule, useCustomHours: true }), "Staff schedule saved.")} />}
      {activeTab === "Tax / VAT" && <TaxPanel value={tax} onChange={setTax} error={errors.ratePercent} saving={isSaving} onSave={() => runSave(() => updateTaxVatSettings(tax), "Tax and VAT settings saved.")} />}
    </div>
  );
}

function GeneralPanel({ value, onChange, error, saving, onSave }: { value: AppointmentSettings["general"]; onChange: (value: AppointmentSettings["general"]) => void; error?: string; saving: boolean; onSave: () => void }) {
  return <ComponentCard title="General settings" desc="Configure how customers can create and cancel appointments."><SettingRow title="Allow same-day bookings" description="Let customers book appointments for the current day."><Switch label="" checked={value.allowSameDayBookings} onChange={(allowSameDayBookings) => onChange({ ...value, allowSameDayBookings })} /></SettingRow><SettingRow title="Cancellation notice period" description="Minimum notice required before an appointment can be cancelled."><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[120px_150px]"><Input type="number" min="0" step={1} value={value.cancellationNoticeValue} error={!!error} onChange={(event) => onChange({ ...value, cancellationNoticeValue: Number(event.target.value) })} ariaLabel="Cancellation notice value" /><Select key={value.cancellationNoticeUnit} options={["Minutes", "Hours", "Days"].map((unit) => ({ value: unit, label: unit }))} defaultValue={value.cancellationNoticeUnit} onChange={(cancellationNoticeUnit) => onChange({ ...value, cancellationNoticeUnit: cancellationNoticeUnit as AppointmentSettings["general"]["cancellationNoticeUnit"] })} /></div>{error && <p className="mt-1 text-xs text-error-500">{error}</p>}</SettingRow><SettingRow title="Auto-confirm appointments" description="Confirm new bookings automatically without manual review."><Switch label="" checked={value.autoConfirmAppointments} onChange={(autoConfirmAppointments) => onChange({ ...value, autoConfirmAppointments })} /></SettingRow><div className="flex justify-end"><Button size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button></div></ComponentCard>;
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 last:border-0 dark:border-gray-800 sm:flex-row sm:items-center"><div><p className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p></div><div className="shrink-0">{children}</div></div>;
}

function SchedulePanel({ title, description, days, onChange, errors, saving, saveLabel, onSave }: { title: string; description: string; days: ScheduleDay[]; onChange: (days: ScheduleDay[]) => void; errors: Record<string, string>; saving: boolean; saveLabel: string; onSave: () => void }) {
  return <ComponentCard title={title} desc={description} headerClassName="px-4 py-3 sm:px-5" bodyClassName="p-3 sm:p-4" contentClassName="space-y-3"><ScheduleEditor days={days} onChange={onChange} errors={errors} /><div className="flex justify-end"><Button size="sm" className="!min-h-9 !px-3 !py-1.5" onClick={onSave} disabled={saving}>{saving ? "Saving..." : saveLabel}</Button></div></ComponentCard>;
}

function StaffPanel({ staffMembers, schedule, errors, loading, saving, onSelect, onChange, onSave }: { staffMembers: StaffMember[]; schedule: StaffScheduleSettings | null; errors: Record<string, string>; loading: boolean; saving: boolean; onSelect: (id: string) => void; onChange: (value: StaffScheduleSettings) => void; onSave: () => void }) {
  const options = staffMembers.filter((staff) => staff.isActive).map((staff) => ({ value: staff.id, label: staff.name }));
  return <ComponentCard title="Staff schedules" desc="Choose a team member and configure their availability." headerClassName="px-4 py-3 sm:px-5" bodyClassName="p-3 sm:p-4" contentClassName="space-y-3"><div className="max-w-md"><Label>Staff member</Label><Select key={schedule?.staffId ?? "none"} options={options} defaultValue={schedule?.staffId ?? ""} onChange={onSelect} placeholder="Select staff member" /></div>{loading && <p className="text-sm text-gray-500">Loading schedule...</p>}{schedule && !loading && <><ScheduleEditor days={schedule.days} onChange={(days) => onChange({ ...schedule, days })} errors={errors} /><div className="flex justify-end"><Button size="sm" className="!min-h-9 !px-3 !py-1.5" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Schedule"}</Button></div></>}</ComponentCard>;
}

function TaxPanel({ value, onChange, error, saving, onSave }: { value: TaxVatSettings; onChange: (value: TaxVatSettings) => void; error?: string; saving: boolean; onSave: () => void }) {
  const example = useMemo(() => calculateTax(10, value), [value]);
  return <ComponentCard title="Tax / VAT" desc="These settings are used automatically by future invoices and expenses." headerClassName="px-4 py-3 sm:px-5" bodyClassName="p-3 sm:p-4" contentClassName="space-y-3"><div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800"><div><p className="text-sm font-medium text-gray-800 dark:text-white/90">Enable VAT</p><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Apply VAT to invoices generated from appointments.</p></div><Switch label="" checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} /></div><div><Label>VAT Type</Label><div className="grid gap-2 md:grid-cols-2">{(["Exclusive", "Inclusive"] as VatType[]).map((type) => <button key={type} type="button" disabled={!value.enabled} onClick={() => onChange({ ...value, type })} className={`rounded-xl border p-3 text-left transition-colors ${value.type === type ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-800"} disabled:cursor-not-allowed disabled:opacity-50`}><Radio id={`vat-type-${type}`} name="vat-type" value={type} label={type} checked={value.type === type} disabled={!value.enabled} onChange={(next) => onChange({ ...value, type: next as VatType })} /><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{type === "Exclusive" ? "VAT is added to the service price." : "VAT is already included and is back-calculated."}</p></button>)}</div></div><div className="grid gap-3 md:grid-cols-2"><div><Label>VAT Rate (%)</Label><Input type="number" min="0" max="100" step={0.001} value={value.ratePercent} disabled={!value.enabled} error={!!error} onChange={(event) => onChange({ ...value, ratePercent: Number(event.target.value) })} className="!h-10 !py-2" />{error && <p className="mt-1 text-xs text-error-500">{error}</p>}</div><div><Label>VAT Registration Number (TRN)</Label><Input value={value.registrationNumber} disabled={!value.enabled} onChange={(event) => onChange({ ...value, registrationNumber: event.target.value })} placeholder="e.g. 1234567890" className="!h-10 !py-2" /></div></div><div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]"><p className="text-sm font-medium text-gray-800 dark:text-white/90">Live invoice example</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Service price: 10.000 BHD · Subtotal: {example.subtotalBhd.toFixed(3)} BHD · VAT: {example.vatBhd.toFixed(3)} BHD · Customer pays: {example.totalBhd.toFixed(3)} BHD</p></div><div className="flex justify-end"><Button size="sm" className="!min-h-9 !px-3 !py-1.5" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button></div></ComponentCard>;
}

function cloneSchedule(schedule: StaffScheduleSettings): StaffScheduleSettings { return { ...schedule, days: schedule.days.map((day) => ({ ...day })) }; }
