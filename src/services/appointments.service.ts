import type {
  ActivityItem,
  Appointment,
  AppointmentCreateInput,
  AppointmentStatus,
} from "@/types/appointments";
import type { Customer } from "@/types/customers";
import { validateAppointmentServiceFieldValues } from "./service-booking-fields.service";

export function subscribeToAppointments(_listener?: () => void) {
  void _listener;
  return () => undefined;
}

export async function getAppointments(): Promise<Appointment[]> {
  return (await appointmentRequest("/api/appointments")).appointments;
}

export async function getAppointmentByBookingNumber(bookingNumber: string) {
  return (
    (await getAppointments()).find(
      (appointment) => appointment.bookingNumber === bookingNumber,
    ) ?? null
  );
}

export async function getAppointmentActivity(
  appointmentId: string,
): Promise<ActivityItem[]> {
  return (
    await appointmentRequest(
      `/api/appointments/${encodeURIComponent(appointmentId)}/activity`,
    )
  ).activity;
}

export async function createAppointment(input: AppointmentCreateInput) {
  await validateServiceFields(input);
  return (
    await appointmentRequest("/api/appointments", {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
  ).appointment as Appointment;
}

export async function updateAppointmentBooking(
  appointmentId: string,
  input: AppointmentCreateInput,
) {
  await validateServiceFields(input);
  return (
    await appointmentRequest(`/api/appointments/${encodeURIComponent(appointmentId)}`, {
      body: JSON.stringify({ input, kind: "booking" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    })
  ).appointment as Appointment;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
) {
  return patchAppointment(appointmentId, { kind: "status", status });
}

export async function reassignAppointmentStaff(
  appointmentId: string,
  staffId: string,
) {
  const current = (await getAppointments()).find((item) => item.id === appointmentId);
  if (!current) throw new Error("Appointment record was not found.");
  return updateAppointmentBooking(appointmentId, {
    appointmentDate: current.appointmentDate,
    branchId: current.branchId,
    createdBy: current.createdBy,
    customerId: current.customerId,
    endTime: current.endTime,
    notes: current.notes,
    serviceId: current.serviceId,
    staffId,
    startTime: current.startTime,
    status: current.status,
  });
}

export async function recordAdvancePayment(appointmentId: string, amountBhd: number) {
  return patchAppointment(appointmentId, { amountBhd, kind: "payment" });
}

export async function synchronizeAppointmentCustomer(_customer: Customer) {
  void _customer;
  // Appointment snapshots intentionally preserve the details used when booked.
}

export async function deleteAppointment(appointmentId: string) {
  const response = await fetch(
    `/api/appointments/${encodeURIComponent(appointmentId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "The appointment could not be deleted.");
  }
}

export async function addAppointmentNote(appointmentId: string, note: string) {
  return (
    await appointmentRequest(
      `/api/appointments/${encodeURIComponent(appointmentId)}/activity`,
      {
        body: JSON.stringify({ note }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    )
  ).activity as ActivityItem;
}

async function patchAppointment(appointmentId: string, body: object) {
  return (
    await appointmentRequest(`/api/appointments/${encodeURIComponent(appointmentId)}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    })
  ).appointment as Appointment;
}

async function validateServiceFields(input: AppointmentCreateInput) {
  const errors = await validateAppointmentServiceFieldValues(
    input.serviceId,
    input.serviceFieldValues ?? {},
  );
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
}

async function appointmentRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Appointment request failed.");
  return body;
}
