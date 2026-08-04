"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  Appointment,
  AppointmentRescheduleRequestView,
} from "@/types/appointments";

export default function BookingOperationsPanel({
  appointment,
  request,
}: {
  appointment: Appointment;
  request: AppointmentRescheduleRequestView | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const decide = async (
    kind: "booking" | "reschedule",
    id: string,
    decision: "approve" | "reject",
  ) => {
    if (decision === "reject" && reason.trim().length < 3) {
      setError("Enter a rejection reason of at least 3 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const url =
      kind === "booking"
        ? `/api/appointments/${appointment.id}/decision`
        : `/api/reschedule-requests/${id}/decision`;
    const response = await fetch(url, {
      body: JSON.stringify({ decision, reason: reason.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "The decision could not be saved.");
      setBusy(false);
      return;
    }
    setReason("");
    setBusy(false);
    router.refresh();
  };

  const bookingPending =
    appointment.bookingSource === "public" && appointment.status === "Booked";
  if (!bookingPending && !request && !appointment.financialFollowUpRequired) return null;

  const current = `${appointment.appointmentDate} ${appointment.startTime}–${appointment.endTime} with ${appointment.staffName}`;
  const proposed = request
    ? `${formatDateTime(request.proposedStartsAt)}–${formatTime(request.proposedEndsAt)} with ${request.proposedStaffName} at ${request.proposedBranchName}`
    : "";

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <h2 className="text-lg font-semibold text-gray-800">Booking operations</h2>
      {bookingPending && (
        <div className="mt-4 rounded-xl bg-white p-4">
          <p className="font-medium">Public booking awaiting approval</p>
          <p className="mt-1 text-sm text-gray-500">{current}</p>
          <DecisionButtons
            busy={busy}
            onApprove={() => void decide("booking", appointment.id, "approve")}
            onReject={() => void decide("booking", appointment.id, "reject")}
          />
        </div>
      )}
      {request && (
        <div className="mt-4 rounded-xl bg-white p-4">
          <p className="font-medium">Customer reschedule request</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-xs text-gray-400">Current</span><p className="mt-1">{current}</p></div>
            <div><span className="text-xs text-gray-400">Proposed</span><p className="mt-1">{proposed}</p></div>
          </div>
          <DecisionButtons
            busy={busy}
            onApprove={() => void decide("reschedule", request.id, "approve")}
            onReject={() => void decide("reschedule", request.id, "reject")}
          />
        </div>
      )}
      {(bookingPending || request) && (
        <label className="mt-4 block text-sm font-medium">
          Rejection reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={2}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-[#7b1635]"
            placeholder="Required when rejecting"
          />
        </label>
      )}
      {appointment.financialFollowUpRequired && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          Manual refund review required: this cancelled appointment has an advance payment.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-amber-200 pt-4">
        {[
          ["Confirmation", `Hello ${appointment.customerName}, your appointment ${appointment.bookingNumber} is confirmed for ${current}.`],
          ["Rejection", `Hello ${appointment.customerName}, your appointment request ${appointment.bookingNumber} could not be approved. Please contact us to choose another time.`],
          ["Cancellation", `Hello ${appointment.customerName}, appointment ${appointment.bookingNumber} has been cancelled.`],
          ["Reschedule", `Hello ${appointment.customerName}, the reschedule for appointment ${appointment.bookingNumber} has been updated. Please check your booking details.`],
        ].map(([label, message]) => (
          <button
            key={label}
            onClick={() => void navigator.clipboard.writeText(message)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium"
          >
            Copy {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">Messages are copied only. Slotova sends nothing automatically.</p>
    </section>
  );
}

function DecisionButtons({
  busy,
  onApprove,
  onReject,
}: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <button disabled={busy} onClick={onApprove} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Approve</button>
      <button disabled={busy} onClick={onReject} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50">Reject</button>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Bahrain",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Bahrain",
  }).format(new Date(value));
}
