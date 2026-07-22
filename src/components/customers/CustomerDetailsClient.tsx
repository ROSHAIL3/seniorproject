"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import AppointmentStatusBadge from "@/components/appointments/AppointmentStatusBadge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeftIcon,
  PencilIcon,
  TrashBinIcon,
} from "@/icons";
import { formatBhd, formatDisplayDate } from "@/lib/formatters";
import {
  getCustomerProfile,
  removeCustomer,
  synchronizeCustomer,
} from "@/services/customer-profiles.service";
import { updateCustomerPhoto } from "@/services/customers.service";
import type { Customer, CustomerProfile } from "@/types/customers";
import CustomerAvatar from "./CustomerAvatar";
import CustomerFormModal from "./CustomerFormModal";
import CustomerStatusBadge from "./CustomerStatusBadge";
import { useCustomerFields } from "@/hooks/useCustomerFields";
import { formatCustomerFieldValue } from "@/services/customer-fields.service";

type CustomerDetailsClientProps = {
  customerId: string;
  initialProfile: CustomerProfile | null;
};

export default function CustomerDetailsClient({
  customerId,
  initialProfile,
}: CustomerDetailsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [isLoading, setIsLoading] = useState(!initialProfile);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [mutationState, setMutationState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const customFields = useCustomerFields();
  const customValueMap = useMemo(() => Object.fromEntries((profile?.customFieldValues ?? []).map((record) => [record.fieldId, record.value])), [profile?.customFieldValues]);

  const refresh = async () => {
    const updated = await getCustomerProfile(customerId);
    setProfile(updated);
    setIsLoading(false);
  };

  useEffect(() => {
    if (initialProfile) return;
    let isActive = true;
    void getCustomerProfile(customerId).then((updated) => {
      if (!isActive) return;
      setProfile(updated);
      setIsLoading(false);
    });
    return () => {
      isActive = false;
    };
  }, [customerId, initialProfile]);

  const handleSaved = async (customer: Customer) => {
    setMutationState("loading");
    try {
      await synchronizeCustomer(customer);
      await refresh();
      setMessage("Customer information was updated successfully.");
      setMutationState("success");
    } catch {
      setMessage("The customer information could not be synchronized.");
      setMutationState("error");
    }
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 3 * 1024 * 1024) {
      setMessage("Choose a PNG, JPG, or WebP image no larger than 3 MB.");
      setMutationState("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") return;
      setMutationState("loading");
      try {
        const customer = await updateCustomerPhoto(customerId, reader.result);
        setProfile((current) =>
          current ? { ...current, customer } : current,
        );
        setMessage("Profile photo was updated successfully.");
        setMutationState("success");
      } catch {
        setMessage("The profile photo could not be updated.");
        setMutationState("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmRemoval = async () => {
    setMutationState("loading");
    try {
      const result = await removeCustomer(customerId);
      setIsDeleteOpen(false);
      if (result === "deleted") {
        router.push("/customers");
        return;
      }
      await refresh();
      setMessage(
        "This customer has linked appointments, so the record was archived instead of deleted.",
      );
      setMutationState("success");
    } catch {
      setMessage("The customer could not be removed or archived.");
      setMutationState("error");
    }
  };

  if (isLoading) return <CustomerDetailsLoading />;

  if (!profile) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Customer not found
        </h1>
        <Button href="/customers" size="sm" className="mt-5">
          Back to Customers
        </Button>
      </div>
    );
  }

  const { customer } = profile;
  const hasAppointments = profile.appointments.length > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-500 dark:text-gray-400"
      >
        <ChevronLeftIcon className="size-4" />
        Back to Customers
      </Link>

      {mutationState === "success" && message && (
        <div className="rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500">
          {message}
        </div>
      )}
      {mutationState === "error" && message && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-500">
          {message}
        </div>
      )}

      <ComponentCard
        title="Customer Details"
        action={
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              onClick={() => setIsEditOpen(true)}
              startIcon={<PencilIcon />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDeleteOpen(true)}
              startIcon={<TrashBinIcon />}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <CustomerAvatar
            name={customer.name}
            photoUrl={customer.photoUrl}
            className="size-24"
          />
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {customer.name}
            </h1>
            <div className="mt-2">
              <CustomerStatusBadge status={customer.status} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => handlePhoto(event.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={mutationState === "loading"}
            >
              Upload photo
            </Button>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG or WebP. Max 3 MB.</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Detail label="Email" value={customer.email || "No email"} />
          <Detail label="Phone" value={customer.phone} />
          <Detail label="Status" value={customer.status} />
          <Detail label="Total visits" value={String(profile.totalVisits)} />
          <Detail label="No-shows" value={String(profile.noShows)} />
          <Detail label="Total spent" value={formatBhd(profile.totalSpentBhd)} />
          <Detail
            label="Last visit"
            value={profile.lastVisit ? formatDisplayDate(profile.lastVisit) : "No visits"}
          />
          <Detail label="Notes" value={customer.notes || "No notes"} />
        </div>
        {customFields.length > 0 && <div className="border-t border-gray-100 pt-5 dark:border-gray-800"><h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Additional Information</h2><div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{customFields.map((field) => <Detail key={field.id} label={field.label} value={formatCustomerFieldValue(field, customValueMap[field.id])} />)}</div></div>}
      </ComponentCard>

      <ComponentCard title="Appointments" bodyClassName="p-0">
        {profile.appointments.length > 0 ? (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <TableRow>
                  {["Date", "Time", "Service", "Staff", "Status"].map((heading) => (
                    <TableCell key={heading} isHeader className="px-6 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {profile.appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="px-6 py-4 text-sm">
                      <Link href={`/appointments/${appointment.bookingNumber}`} className="font-medium text-brand-500 hover:text-brand-600">
                        {formatDisplayDate(appointment.appointmentDate)}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {appointment.startTime}–{appointment.endTime}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{appointment.serviceName}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{appointment.staffName}</TableCell>
                    <TableCell className="px-6 py-4"><AppointmentStatusBadge status={appointment.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No appointments linked to this customer.
          </div>
        )}
      </ComponentCard>

      <CustomerFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        customer={customer}
        onSaved={handleSaved}
      />

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} className="max-w-lg p-6 sm:p-8">
        <h2 className="pr-12 text-xl font-semibold text-gray-800 dark:text-white/90">
          {hasAppointments ? "Archive customer?" : "Delete customer?"}
        </h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {hasAppointments
            ? "This customer has linked appointments and cannot be permanently deleted. The customer will be marked inactive instead."
            : "This customer has no linked appointments and will be permanently deleted. This action cannot be undone."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setIsDeleteOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={confirmRemoval} disabled={mutationState === "loading"}>
            {mutationState === "loading" ? "Processing..." : hasAppointments ? "Archive" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

function CustomerDetailsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading customer details">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}
