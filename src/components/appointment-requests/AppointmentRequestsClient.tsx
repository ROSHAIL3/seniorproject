"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BookingToast, {
  type BookingToastMessage,
} from "@/components/appointments/BookingToast";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Pagination from "@/components/tables/Pagination";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchIcon, TimeIcon } from "@/icons";
import { formatBhd, formatDisplayDate } from "@/lib/formatters";
import type {
  AppointmentRequest,
  AppointmentRequestStatus,
} from "@/types/appointment-requests";

const pageSize = 10;
const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export default function AppointmentRequestsClient({
  initialRequests,
  canDecide,
}: {
  initialRequests: AppointmentRequest[];
  canDecide: boolean;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<BookingToastMessage | null>(null);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (filterTimer.current) clearTimeout(filterTimer.current);
    },
    [],
  );

  const selectedRequest = requests.find((item) => item.id === selectedId) ?? null;
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        [
          request.bookingNumber,
          request.customerName,
          request.customerPhone,
          request.customerEmail,
          request.serviceName,
          request.staffName,
          request.branchName,
        ].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === "all" || request.status === status;
      const matchesDate = !date || request.appointmentDate === date;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [date, requests, search, status]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hasFilters = Boolean(search.trim() || date || status !== "all");

  const filterChanged = (change: () => void) => {
    change();
    setPage(1);
    setIsFiltering(true);
    if (filterTimer.current) clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => setIsFiltering(false), 180);
  };

  const openDetails = (request: AppointmentRequest, reject = false) => {
    setSelectedId(request.id);
    setShowRejectForm(reject);
    setRejectionReason("");
    setError("");
  };

  const closeDetails = () => {
    if (busyId) return;
    setSelectedId("");
    setShowRejectForm(false);
    setRejectionReason("");
    setError("");
  };

  const decide = async (
    request: AppointmentRequest,
    decision: "approve" | "reject",
  ) => {
    const reason = rejectionReason.trim();
    if (decision === "reject" && reason.length < 3) {
      setError("Enter a rejection reason of at least 3 characters.");
      return;
    }

    setBusyId(request.id);
    setError("");
    const response = await fetch(`/api/appointments/${request.id}/decision`, {
      body: JSON.stringify({ decision, reason }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body.error ?? "The appointment request could not be updated.";
      setError(message);
      setToast({
        id: Date.now(),
        message,
        title: "Request not updated",
        type: "error",
      });
      setBusyId("");
      return;
    }

    const nextStatus: AppointmentRequestStatus =
      decision === "approve" ? "Approved" : "Rejected";
    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              decidedAt: new Date().toISOString(),
              rejectionReason: decision === "reject" ? reason : "",
              status: nextStatus,
            }
          : item,
      ),
    );
    window.dispatchEvent(
      new CustomEvent("slotova:appointment-requests-changed", {
        detail: { delta: -1 },
      }),
    );
    setToast({
      id: Date.now(),
      message:
        decision === "approve"
          ? "The appointment is confirmed in Appointments and Calendar."
          : "The request was rejected and its reserved time was released.",
      title: decision === "approve" ? "Request approved" : "Request rejected",
      type: "success",
    });
    setBusyId("");
    setSelectedId("");
    setShowRejectForm(false);
    setRejectionReason("");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Appointment Requests
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review and manage appointment requests submitted by customers.
        </p>
      </header>

      <section
        aria-label="Appointment request filters"
        className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_190px_190px_auto]"
      >
        <Input
          value={search}
          onChange={(event) => filterChanged(() => setSearch(event.target.value))}
          placeholder="Search requests"
          ariaLabel="Search appointment requests"
          startIcon={<SearchIcon />}
        />
        <Select
          key={status}
          options={statusOptions}
          defaultValue={status}
          onChange={(value) => filterChanged(() => setStatus(value))}
          placeholder="Status"
        />
        <Input
          type="date"
          value={date}
          onChange={(event) => filterChanged(() => setDate(event.target.value))}
          ariaLabel="Filter by requested appointment date"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              filterChanged(() => {
                setSearch("");
                setStatus("all");
                setDate("");
              })
            }
            className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Clear filters
          </button>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        {error && !selectedRequest && (
          <div role="alert" className="border-b border-error-200 bg-error-50 px-5 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        {isFiltering ? (
          <RequestListLoading />
        ) : requests.length === 0 ? (
          <RequestEmpty title="No appointment requests found." description="Customer booking requests will appear here when they are submitted." />
        ) : filteredRequests.length === 0 ? (
          <RequestEmpty title="No search results" description="Try changing the search, status, or date filter." />
        ) : (
          <>
            <RequestTable
              requests={visibleRequests}
              canDecide={canDecide}
              busyId={busyId}
              onApprove={(request) => void decide(request, "approve")}
              onOpen={openDetails}
            />
            <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length}
              </p>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </section>

      <RequestDetailsModal
        request={selectedRequest}
        canDecide={canDecide}
        busy={busyId === selectedRequest?.id}
        error={error}
        reason={rejectionReason}
        showRejectForm={showRejectForm}
        onApprove={(request) => void decide(request, "approve")}
        onClose={closeDetails}
        onReasonChange={setRejectionReason}
        onReject={(request) => void decide(request, "reject")}
        onShowReject={() => {
          setShowRejectForm(true);
          setError("");
        }}
      />
      {toast && <BookingToast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function RequestTable({
  requests,
  canDecide,
  busyId,
  onApprove,
  onOpen,
}: {
  requests: AppointmentRequest[];
  canDecide: boolean;
  busyId: string;
  onApprove: (request: AppointmentRequest) => void;
  onOpen: (request: AppointmentRequest, reject?: boolean) => void;
}) {
  const headings = ["Customer", "Service", "Staff", "Date & time", "Branch", "Submitted", "Status", "Actions"];
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <Table className="min-w-[1180px]">
          <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableRow>
              {headings.map((heading) => (
                <TableCell key={heading} isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((request) => (
              <TableRow key={request.id} className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <TableCell className="px-4 py-4">
                  <p className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-white/90">{request.customerName}</p>
                  <p className="mt-0.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{request.customerPhone || request.customerEmail}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{request.serviceName}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{request.staffName}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>{formatDisplayDate(request.appointmentDate)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{request.startTime}–{request.endTime}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{request.branchName}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(request.submittedAt)}</TableCell>
                <TableCell className="px-4 py-4"><RequestStatusBadge status={request.status} /></TableCell>
                <TableCell className="px-4 py-4">
                  <RequestActions request={request} canDecide={canDecide} busy={busyId === request.id} onApprove={onApprove} onOpen={onOpen} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800 lg:hidden">
        {requests.map((request) => (
          <article key={request.id} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-800 dark:text-white/90">{request.customerName}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{request.customerPhone || request.customerEmail}</p>
              </div>
              <RequestStatusBadge status={request.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <CompactDetail label="Service" value={request.serviceName} />
              <CompactDetail label="Staff" value={request.staffName} />
              <CompactDetail label="Date" value={formatDisplayDate(request.appointmentDate)} />
              <CompactDetail label="Time" value={`${request.startTime}–${request.endTime}`} />
              <CompactDetail label="Branch" value={request.branchName} />
              <CompactDetail label="Submitted" value={formatTimestamp(request.submittedAt)} />
            </dl>
            <div className="mt-4">
              <RequestActions request={request} canDecide={canDecide} busy={busyId === request.id} onApprove={onApprove} onOpen={onOpen} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function RequestActions({
  request,
  canDecide,
  busy,
  onApprove,
  onOpen,
}: {
  request: AppointmentRequest;
  canDecide: boolean;
  busy: boolean;
  onApprove: (request: AppointmentRequest) => void;
  onOpen: (request: AppointmentRequest, reject?: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onOpen(request)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
        View Details
      </button>
      {request.status === "Pending" && canDecide && (
        <>
          <button type="button" disabled={busy} onClick={() => onApprove(request)} className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-brand-400 disabled:opacity-50">
            {busy ? "Saving…" : "Approve"}
          </button>
          <button type="button" disabled={busy} onClick={() => onOpen(request, true)} className="rounded-lg border border-error-200 px-3 py-2 text-xs font-medium text-error-700 hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10">
            Reject
          </button>
        </>
      )}
    </div>
  );
}

function RequestDetailsModal({
  request,
  canDecide,
  busy,
  error,
  reason,
  showRejectForm,
  onApprove,
  onClose,
  onReasonChange,
  onReject,
  onShowReject,
}: {
  request: AppointmentRequest | null;
  canDecide: boolean;
  busy: boolean;
  error: string;
  reason: string;
  showRejectForm: boolean;
  onApprove: (request: AppointmentRequest) => void;
  onClose: () => void;
  onReasonChange: (value: string) => void;
  onReject: (request: AppointmentRequest) => void;
  onShowReject: () => void;
}) {
  return (
    <Modal isOpen={Boolean(request)} onClose={onClose} className="mx-4 max-h-[90vh] max-w-2xl overflow-y-auto p-5 sm:p-6">
      {request && (
        <div>
          <div className="pr-12">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">{request.bookingNumber}</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">Appointment request details</h2>
            <div className="mt-3"><RequestStatusBadge status={request.status} /></div>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <Detail label="Customer name" value={request.customerName} />
            <Detail label="Phone" value={request.customerPhone || "Not provided"} />
            <Detail label="Email" value={request.customerEmail || "Not provided"} />
            <Detail label="Requested service" value={request.serviceName} />
            <Detail label="Requested staff" value={request.staffName} />
            <Detail label="Branch" value={request.branchName} />
            <Detail label="Requested date" value={formatDisplayDate(request.appointmentDate)} />
            <Detail label="Requested time" value={`${request.startTime}–${request.endTime}`} />
            <Detail label="Price" value={formatBhd(request.priceBhd)} />
            <Detail label="Submitted" value={formatTimestamp(request.submittedAt)} />
            {request.decidedAt && <Detail label="Decision date" value={formatTimestamp(request.decidedAt)} />}
            {request.rejectionReason && <Detail label="Rejection reason" value={request.rejectionReason} />}
          </dl>
          <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer notes</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{request.notes || "No notes provided."}</p>
          </div>
          {request.status === "Pending" && canDecide && showRejectForm && (
            <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rejection reason <span className="font-normal text-error-500">(required)</span>
              <textarea
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Add a short reason for the customer"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-400 focus:ring-3 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </label>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-error-600 dark:text-error-400">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">Close</button>
            {request.status === "Pending" && canDecide && !showRejectForm && (
              <>
                <button type="button" disabled={busy} onClick={onShowReject} className="rounded-xl border border-error-200 px-4 py-2.5 text-sm font-medium text-error-700 hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10">Reject</button>
                <button type="button" disabled={busy} onClick={() => onApprove(request)} className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-400 disabled:opacity-50">{busy ? "Saving…" : "Approve"}</button>
              </>
            )}
            {request.status === "Pending" && canDecide && showRejectForm && (
              <button type="button" disabled={busy} onClick={() => onReject(request)} className="rounded-xl bg-error-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-700 disabled:opacity-50">{busy ? "Saving…" : "Confirm rejection"}</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function RequestStatusBadge({ status }: { status: AppointmentRequestStatus }) {
  const tones: Record<AppointmentRequestStatus, string> = {
    Approved: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
    Pending: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    Rejected: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>{status}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">{value}</dd></div>;
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-gray-400">{label}</dt><dd className="mt-0.5 truncate text-gray-700 dark:text-gray-300">{value}</dd></div>;
}

function RequestEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"><TimeIcon className="size-6" /></span>
      <h2 className="mt-4 font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function RequestListLoading() {
  return <div aria-label="Filtering appointment requests">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="flex gap-4 border-b border-gray-100 p-5 last:border-0 dark:border-gray-800">{[0, 1, 2, 3].map((cell) => <div key={cell} className="h-4 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}</div>)}</div>;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bahrain",
  }).format(new Date(value));
}
