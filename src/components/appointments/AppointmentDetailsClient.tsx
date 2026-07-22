"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  ChevronLeftIcon,
  DocsIcon,
  DollarLineIcon,
  EnvelopeIcon,
  PencilIcon,
  UserIcon,
} from "@/icons";
import { formatBhd } from "@/lib/formatters";
import {
  reassignAppointmentStaff,
  recordAdvancePayment,
  updateAppointmentStatus,
} from "@/services/appointments.service";
import type {
  ActivityItem,
  Appointment,
  AppointmentStatus,
} from "@/types/appointments";
import type { StaffMember } from "@/types/staff";
import type { AppointmentServiceFieldDetail } from "@/types/services";
import { getAppointmentServiceFieldDetails } from "@/services/service-booking-fields.service";
import AppointmentDetailsCard from "./AppointmentDetailsCard";
import AppointmentStatusBadge from "./AppointmentStatusBadge";
import NotesActivityPanel from "./NotesActivityPanel";

type AppointmentDetailsClientProps = {
  appointment: Appointment;
  staffMembers: StaffMember[];
  activity: ActivityItem[];
  serviceFieldDetails: AppointmentServiceFieldDetail[];
};

const statusOptions = [
  "Booked",
  "Confirmed",
  "Completed",
  "Cancelled",
  "No Show",
].map((status) => ({ value: status, label: status }));

export default function AppointmentDetailsClient({
  appointment,
  staffMembers,
  activity,
  serviceFieldDetails,
}: AppointmentDetailsClientProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(appointment);
  const [staffId, setStaffId] = useState(appointment.staffId);
  const [advanceInput, setAdvanceInput] = useState(
    String(appointment.advancePaidBhd),
  );
  const [activeModal, setActiveModal] = useState<"reassign" | "payment" | null>(null);
  const [mutationState, setMutationState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [currentFieldDetails, setCurrentFieldDetails] = useState(serviceFieldDetails);
  useEffect(() => { queueMicrotask(() => { getAppointmentServiceFieldDetails(appointment.id, appointment.serviceId).then(setCurrentFieldDetails); }); }, [appointment.id, appointment.serviceId]);

  const staffOptions = staffMembers.map((staff) => ({
    value: staff.id,
    label: staff.name,
  }));
  const remainingBalance = Math.max(
    current.priceBhd - current.advancePaidBhd,
    0,
  );

  const runMutation = async (operation: () => Promise<Appointment>) => {
    setMutationState("loading");
    try {
      const updated = await operation();
      setCurrent(updated);
      setMutationState("success");
      setActiveModal(null);
    } catch {
      setMutationState("error");
    }
  };

  return (
    <div className="space-y-6">
      {mutationState === "error" && (
        <Alert
          variant="error"
          title="Update failed"
          message="The appointment could not be updated. Please try again."
        />
      )}
      {mutationState === "success" && (
        <Alert
          variant="success"
          title="Appointment updated"
          message="Your changes were saved successfully."
        />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/appointments"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Back to Appointments"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-gray-800 dark:text-white/90">
                {current.customerName}
              </h1>
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                Booking {current.bookingNumber}
              </span>
            </div>
            <Link href="/appointments" className="mt-1 inline-block text-sm text-brand-500 hover:text-brand-600">
              Back to Appointments
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AppointmentStatusBadge status={current.status} />
          <div className="w-40">
            <Select
              key={current.status}
              options={statusOptions}
              defaultValue={current.status}
              onChange={(value) =>
                runMutation(() =>
                  updateAppointmentStatus(
                    current.id,
                    value as AppointmentStatus,
                  ),
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <Button size="sm" onClick={() => router.push(`/appointments/new?edit=${current.bookingNumber}`)} startIcon={<PencilIcon className="size-4" />}>
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActiveModal("reassign")} startIcon={<UserIcon className="size-4" />}>
          Reassign staff
        </Button>
        <Button size="sm" variant="outline" onClick={() => { window.location.href = `mailto:${current.customerEmail}`; }} startIcon={<EnvelopeIcon className="size-4" />}>
          Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()} startIcon={<DocsIcon />}>
          Print
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActiveModal("payment")} startIcon={<DollarLineIcon />} className="sm:ml-auto">
          Advance Payment
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <AppointmentDetailsCard appointment={current} />
          {currentFieldDetails.length > 0 && <ComponentCard title="Service-specific information"><dl className="grid gap-5 sm:grid-cols-2">{currentFieldDetails.map(({ field, value }) => <div key={field.id}><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{field.label}</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{field.type === "Checkbox" ? value ? "Yes" : "No" : field.type === "Dropdown" ? field.options.find((option) => option.id === value)?.label ?? String(value) : String(value)}</dd></div>)}</dl></ComponentCard>}
          <ComponentCard title="Payment summary">
            <dl className="space-y-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Service total</dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">{formatBhd(current.priceBhd)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Advance paid</dt>
                <dd className="font-medium text-success-600 dark:text-success-500">{formatBhd(current.advancePaidBhd)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <dt className="font-medium text-gray-800 dark:text-white/90">Remaining balance</dt>
                <dd className="text-lg font-semibold text-brand-600 dark:text-brand-400">{formatBhd(remainingBalance)}</dd>
              </div>
            </dl>
          </ComponentCard>
        </div>
        <div className="col-span-12 xl:col-span-4">
          <NotesActivityPanel appointmentId={current.id} initialActivity={activity} />
        </div>
      </div>

      <Modal isOpen={activeModal === "reassign"} onClose={() => setActiveModal(null)} className="max-w-lg p-6 sm:p-8">
        <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Reassign staff</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a team member for this appointment.</p>
        <div className="mt-6">
          <Select key={staffId} options={staffOptions} defaultValue={staffId} onChange={setStaffId} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button size="sm" disabled={mutationState === "loading"} onClick={() => runMutation(() => reassignAppointmentStaff(current.id, staffId))}>
            {mutationState === "loading" ? "Saving..." : "Save assignment"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={activeModal === "payment"} onClose={() => setActiveModal(null)} className="max-w-lg p-6 sm:p-8">
        <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">Record advance payment</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Maximum service amount: {formatBhd(current.priceBhd)}</p>
        <div className="mt-6">
          <Input type="number" value={advanceInput} min="0" step={0.001} onChange={(event) => setAdvanceInput(event.target.value)} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            size="sm"
            disabled={mutationState === "loading"}
            onClick={() => {
              const amount = Math.min(Math.max(Number(advanceInput) || 0, 0), current.priceBhd);
              runMutation(() => recordAdvancePayment(current.id, amount));
            }}
          >
            {mutationState === "loading" ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
