import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { reportSupabaseError } from "@/lib/supabase/error";
import type { Database, Json } from "@/types/database";
import type {
  ActivityItem,
  Appointment,
  AppointmentCreateInput,
  AppointmentStatus,
  AppointmentRescheduleRequestView,
} from "@/types/appointments";
import type {
  AppointmentRequest,
  AppointmentRequestStatus,
} from "@/types/appointment-requests";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

const toDatabaseStatus = {
  Booked: "booked",
  Cancelled: "cancelled",
  Completed: "completed",
  Confirmed: "confirmed",
  "No Show": "no_show",
} as const;
const fromDatabaseStatus: Record<AppointmentRow["status"], AppointmentStatus> = {
  booked: "Booked",
  cancelled: "Cancelled",
  completed: "Completed",
  confirmed: "Confirmed",
  no_show: "No Show",
};

export async function getAppointmentsFromDatabase(
  client?: SupabaseClient<Database>,
): Promise<Appointment[]> {
  const supabase = client ?? (await createClient());
  const [{ data, error }, { data: memberships }] = await Promise.all([
    supabase.from("appointments").select("*").order("starts_at"),
    supabase.from("organization_members").select("id,staff_key"),
  ]);
  if (error) {
    reportSupabaseError("appointments.list", error);
    throw new Error("Appointments could not be loaded.");
  }
  const staffKeys = new Map(
    (memberships ?? []).map((membership) => [membership.id, membership.staff_key]),
  );
  return data.map((row) => toAppointment(row, staffKeys.get(row.membership_id) ?? ""));
}

export async function getAppointmentRequestsFromDatabase(
  client?: SupabaseClient<Database>,
): Promise<AppointmentRequest[]> {
  const supabase = client ?? (await createClient());
  const [{ data: appointments, error }, { data: branches }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("booking_source", "public")
      .order("created_at", { ascending: false }),
    supabase.from("branches").select("id,name"),
  ]);
  if (error) {
    reportSupabaseError("appointmentRequests.list", error);
    throw new Error("Appointment requests could not be loaded.");
  }

  const branchNames = new Map(
    (branches ?? []).map((branch) => [branch.id, branch.name]),
  );
  return (appointments ?? []).map((row) => {
    const start = bahrainParts(row.starts_at);
    const end = bahrainParts(row.ends_at);
    const status = toRequestStatus(row.request_status, row.status);
    return {
      appointmentDate: start.date,
      bookingNumber: row.booking_number,
      branchName: branchNames.get(row.branch_id) ?? "Branch unavailable",
      customerEmail: row.customer_email,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      decidedAt: row.request_decided_at ?? "",
      endTime: end.time,
      id: row.id,
      notes: row.notes,
      priceBhd: Number(row.price_bhd),
      rejectionReason: row.request_rejection_reason ?? "",
      serviceName: row.offering_name,
      staffName: row.staff_name,
      startTime: start.time,
      status,
      submittedAt: row.created_at,
    };
  });
}

export async function canDecideAppointmentRequestsFromDatabase(
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("has_module_permission", {
    action_name: "edit",
    module_name: "Appointments",
  });
  if (error) {
    reportSupabaseError("appointmentRequests.permission", error);
    return false;
  }
  return Boolean(data);
}

export async function getAppointmentByBookingNumberFromDatabase(
  bookingNumber: string,
  client?: SupabaseClient<Database>,
) {
  const appointments = await getAppointmentsFromDatabase(client);
  return (
    appointments.find((appointment) => appointment.bookingNumber === bookingNumber) ??
    null
  );
}

export async function getAppointmentActivityFromDatabase(
  appointmentId: string,
  client?: SupabaseClient<Database>,
): Promise<ActivityItem[]> {
  const supabase = client ?? (await createClient());
  const [{ data: notes, error: notesError }, { data: history, error: historyError }] =
    await Promise.all([
      supabase
        .from("appointment_notes")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("appointment_status_history")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("changed_at", { ascending: false }),
    ]);
  if (notesError) reportSupabaseError("appointments.activity.notes", notesError);
  if (historyError) reportSupabaseError("appointments.activity.history", historyError);
  if (notesError || historyError) {
    throw new Error("Appointment activity could not be loaded.");
  }
  return [
    ...(notes ?? []).map((note) => ({
      appointmentId,
      detail: note.note,
      id: note.id,
      occurredAt: note.created_at,
      title: "Note added",
    })),
    ...(history ?? []).map((change) => ({
      appointmentId,
      detail: `${
        change.old_status
          ? `Status changed from ${fromDatabaseStatus[change.old_status]} to ${fromDatabaseStatus[change.new_status]}.`
          : `Appointment created as ${fromDatabaseStatus[change.new_status]}.`
      }${change.reason ? ` ${change.reason}.` : ""}${
        change.source === "customer" ? " Changed by customer." : ""
      }`,
      id: change.id,
      occurredAt: change.changed_at,
      title: "Status updated",
    })),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export async function saveAppointmentInDatabase(
  id: string | null,
  input: AppointmentCreateInput,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_appointment", {
    target_appointment_id: id,
    target_branch_id: input.branchId,
    target_created_by_name: input.createdBy,
    target_customer_id: input.customerId,
    target_ends_at: bahrainDateTime(input.appointmentDate, input.endTime),
    target_notes: input.notes ?? "",
    target_offering_id: input.serviceId,
    target_service_field_values: (input.serviceFieldValues ?? {}) as unknown as Json,
    target_staff_key: input.staffId,
    target_starts_at: bahrainDateTime(input.appointmentDate, input.startTime),
    target_status: toDatabaseStatus[input.status],
  });
  if (error) reportSupabaseError("appointments.save", error);
  if (error || !data) throw new Error(appointmentError(error?.message));
  const { data: membership } = await supabase
    .from("organization_members")
    .select("staff_key")
    .eq("id", data.membership_id)
    .maybeSingle();
  return toAppointment(data, membership?.staff_key ?? input.staffId);
}

export async function setAppointmentStatusInDatabase(
  id: string,
  status: AppointmentStatus,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_appointment_status", {
    target_appointment_id: id,
    target_status: toDatabaseStatus[status],
  });
  if (error) reportSupabaseError("appointments.status", error);
  if (error || !data) throw new Error(appointmentError(error?.message));
  return hydrateAppointment(data, supabase);
}

export async function setAppointmentPaymentInDatabase(id: string, amountBhd: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_appointment_payment", {
    target_amount_bhd: amountBhd,
    target_appointment_id: id,
  });
  if (error) reportSupabaseError("appointments.payment", error);
  if (error || !data) throw new Error(appointmentError(error?.message));
  return hydrateAppointment(data, supabase);
}

export async function addAppointmentNoteInDatabase(id: string, note: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_appointment_note", {
    target_appointment_id: id,
    target_note: note,
  });
  if (error) reportSupabaseError("appointments.notes.add", error);
  if (error || !data) throw new Error(appointmentError(error?.message));
  return {
    appointmentId: id,
    detail: data.note,
    id: data.id,
    occurredAt: data.created_at,
    title: "Note added",
  } satisfies ActivityItem;
}

export async function deleteAppointmentFromDatabase(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_appointment", {
    target_appointment_id: id,
  });
  if (error) {
    reportSupabaseError("appointments.delete", error);
    throw new Error(appointmentError(error.message));
  }
}

export async function getAppointmentServiceValuesFromDatabase(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("service_field_values")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    reportSupabaseError("appointments.fields", error);
    throw new Error("Appointment fields could not be loaded.");
  }
  return (data?.service_field_values ?? {}) as Record<string, string | boolean>;
}

export async function getPendingRescheduleRequestFromDatabase(
  appointmentId: string,
): Promise<AppointmentRescheduleRequestView | null> {
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("appointment_reschedule_requests")
    .select("*")
    .eq("appointment_id", appointmentId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) {
    reportSupabaseError("appointments.reschedule.pending", error);
    throw new Error("The reschedule request could not be loaded.");
  }
  if (!request) return null;
  const [{ data: membership }, { data: branch }] = await Promise.all([
    supabase.from("organization_members").select("user_id").eq("id", request.proposed_membership_id).maybeSingle(),
    supabase.from("branches").select("name").eq("id", request.proposed_branch_id).maybeSingle(),
  ]);
  const { data: profile } = membership
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", membership.user_id)
        .maybeSingle()
    : { data: null };
  return {
    id: request.id,
    proposedBranchId: request.proposed_branch_id,
    proposedBranchName: branch?.name ?? "Branch unavailable",
    proposedEndsAt: request.proposed_ends_at,
    proposedStaffName: profile?.full_name ?? "Team member",
    proposedStartsAt: request.proposed_starts_at,
    rejectionReason: request.rejection_reason ?? "",
    requestedAt: request.requested_at,
    status: request.status,
  };
}

export function appointmentError(message = "") {
  const messages: [string, string][] = [
    ["APPOINTMENT_FORBIDDEN", "You do not have permission to manage appointments."],
    ["APPOINTMENT_PAST_OR_DURATION", "The appointment must be in the future with a valid duration."],
    ["CUSTOMER_INVALID", "Select an active customer."],
    ["STAFF_INVALID", "Select an active staff member."],
    ["STAFF_BRANCH_CONFLICT", "The selected staff member belongs to another branch."],
    ["BRANCH_INVALID", "Select an active branch."],
    ["STAFF_SERVICE_INVALID", "The selected staff member is not assigned to this service."],
    ["SERVICE_BRANCH_INVALID", "The selected service is not available at this branch."],
    ["PACKAGE_ASSIGNMENT_INVALID", "Every service in this package must support the selected staff and branch."],
    ["OFFERING_INVALID", "Select an active service or package."],
    ["SERVICE_DURATION_INVALID", "The end time must match the selected service duration."],
    ["BUSINESS_HOURS_CONFLICT", "The full appointment must stay within business hours."],
    ["BUSINESS_BREAK_CONFLICT", "The appointment cannot overlap the business break."],
    ["STAFF_DAY_OFF", "The selected staff member is not working that day."],
    ["STAFF_HOURS_CONFLICT", "The full appointment must stay within the staff member’s working hours."],
    ["STAFF_BREAK_CONFLICT", "The appointment cannot overlap the staff member’s break."],
    ["STAFF_TIME_OFF", "The selected staff member is on approved time off."],
    ["STAFF_CONFLICT", "The selected staff member already has an overlapping appointment."],
    ["CUSTOMER_CONFLICT", "The customer already has an overlapping appointment."],
    ["appointments_no_staff_overlap", "The selected staff member was just booked for an overlapping time. Refresh availability and choose another slot."],
    ["appointments_no_customer_overlap", "The customer already has an overlapping active appointment."],
    ["APPOINTMENT_NOT_FOUND", "The appointment could not be found."],
  ];
  return messages.find(([code]) => message.includes(code))?.[1] ??
    "The appointment change could not be saved.";
}

async function hydrateAppointment(
  row: AppointmentRow,
  supabase: SupabaseClient<Database>,
) {
  const { data } = await supabase
    .from("organization_members")
    .select("staff_key")
    .eq("id", row.membership_id)
    .maybeSingle();
  return toAppointment(row, data?.staff_key ?? "");
}

function toAppointment(row: AppointmentRow, staffKey: string): Appointment {
  const start = bahrainParts(row.starts_at);
  const end = bahrainParts(row.ends_at);
  return {
    advancePaidBhd: Number(row.advance_paid_bhd),
    appointmentDate: start.date,
    bookingNumber: row.booking_number,
    branchId: row.branch_id,
    createdAt: row.created_at,
    createdBy: row.created_by_name,
    customerEmail: row.customer_email,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    endTime: end.time,
    id: row.id,
    notes: row.notes || undefined,
    packageId: row.package_id ?? undefined,
    packageType:
      row.package_type === "combo"
        ? "Combo"
        : row.package_type === "flexible"
          ? "Flexible"
          : undefined,
    priceBhd: Number(row.price_bhd),
    serviceId: row.service_id ?? row.package_id ?? "",
    serviceName: row.offering_name,
    staffId: staffKey,
    staffName: row.staff_name,
    startTime: start.time,
    status: fromDatabaseStatus[row.status],
    updatedAt: row.updated_at,
    bookingSource: row.booking_source === "public" ? "public" : "admin",
    financialFollowUpRequired: row.refund_review_required,
  };
}

function toRequestStatus(
  requestStatus: string | null,
  appointmentStatus: AppointmentRow["status"],
): AppointmentRequestStatus {
  if (requestStatus === "approved") return "Approved";
  if (requestStatus === "rejected") return "Rejected";
  if (requestStatus === "pending") return "Pending";
  if (appointmentStatus === "booked") return "Pending";
  return appointmentStatus === "cancelled" ? "Rejected" : "Approved";
}

function bahrainDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+03:00`).toISOString();
}

function bahrainParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bahrain",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}
