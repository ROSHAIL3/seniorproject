import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type {
  PublicBookingConfirmation,
  PublicBookingCreateInput,
  PublicBookingPageData,
  PublicBookingSlot,
  CustomerBookingPage,
  CustomerBookingScope,
  PendingBookingCounts,
} from "@/types/public-booking";

type PublicBookingResult = {
  ok: boolean;
  error?: string;
  bookingNumber?: string;
  referenceToken?: string;
  status?: "booked" | "confirmed";
};

export async function getPublicBookingPage(slug: string) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("get_public_booking_page", {
    booking_slug: slug,
  });
  if (error) throw new Error("The public booking page could not be loaded.");
  if (!data) return null;

  const page = data as unknown as PublicBookingPageData;
  if (page.organization.logoObjectPath) {
    try {
      const admin = createAdminClient();
      const { data: signed } = await admin.storage
        .from("organization-logos")
        .createSignedUrl(page.organization.logoObjectPath, 60 * 60);
      if (signed?.signedUrl) page.organization.logoUrl = signed.signedUrl;
    } catch {
      // The public page remains usable if optional logo signing is unavailable.
    }
  }
  return page;
}

export async function getPublicBookingAvailability(
  slug: string,
  branchId: string,
  serviceId: string,
  date: string,
) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc(
    "get_public_booking_availability",
    {
      booking_slug: slug,
      target_branch_id: branchId,
      target_date: date,
      target_service_id: serviceId,
    },
  );
  if (error) throw new Error("Availability could not be loaded.");
  if (
    data &&
    !Array.isArray(data) &&
    typeof data === "object" &&
    "error" in data
  ) {
    throw new Error(String(data.error));
  }
  return (data ?? []) as unknown as PublicBookingSlot[];
}

export async function createPublicBooking(
  slug: string,
  input: PublicBookingCreateInput,
  requestFingerprint: string,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_public_booking", {
    booking_slug: slug,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    customer_notes: input.customerNotes,
    customer_phone: input.customerPhone,
    request_fingerprint: requestFingerprint,
    submission_id: input.submissionId,
    target_branch_id: input.branchId,
    target_service_field_values:
      input.serviceFieldValues as unknown as Json,
    target_service_id: input.serviceId,
    target_staff_key: input.staffKey,
    target_start_at: input.startAt,
  });
  if (error) throw new Error("BOOKING_FAILED");
  return data as unknown as PublicBookingResult;
}

export async function getPublicBookingConfirmation(
  slug: string,
  referenceToken: string,
) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc(
    "get_public_booking_confirmation",
    {
      booking_slug: slug,
      reference_token: referenceToken,
    },
  );
  if (error) throw new Error("The booking confirmation could not be loaded.");
  return (data as unknown as PublicBookingConfirmation | null) ?? null;
}

export async function authenticateCustomerBookings(
  slug: string,
  phone: string,
  accessCode: string,
  fingerprint: string,
) {
  const { data, error } = await createAdminClient().rpc(
    "authenticate_customer_bookings",
    {
      access_code: accessCode,
      booking_slug: slug,
      customer_phone: phone,
      request_fingerprint: fingerprint,
    },
  );
  if (error) throw new Error("ACCESS_FAILED");
  return data as unknown as {
    ok: boolean;
    error?: string;
    organizationId?: string;
    customerId?: string;
  };
}

export async function authenticateCustomerBookingLink(
  slug: string,
  referenceToken: string,
  fingerprint: string,
) {
  const { data, error } = await createAdminClient().rpc(
    "authenticate_customer_booking_link",
    {
      booking_slug: slug,
      reference_token: referenceToken,
      request_fingerprint: fingerprint,
    },
  );
  if (error) throw new Error("ACCESS_FAILED");
  return data as unknown as {
    ok: boolean;
    error?: string;
    organizationId?: string;
    customerId?: string;
  };
}

export async function getCustomerBookings(
  organizationId: string,
  customerId: string,
  scope: CustomerBookingScope,
  cursor?: { startsAt: string; id: string } | null,
) {
  const { data, error } = await createAdminClient().rpc("get_customer_bookings", {
    booking_scope: scope,
    cursor_id: cursor?.id ?? null,
    cursor_starts_at: cursor?.startsAt ?? null,
    page_limit: 20,
    target_customer_id: customerId,
    target_organization_id: organizationId,
  });
  if (error) throw new Error("Bookings could not be loaded.");
  return data as unknown as CustomerBookingPage;
}

export async function cancelCustomerAppointment(
  organizationId: string,
  customerId: string,
  appointmentId: string,
  fingerprint: string,
) {
  const { data, error } = await createAdminClient().rpc(
    "cancel_customer_appointment",
    {
      request_fingerprint: fingerprint,
      target_appointment_id: appointmentId,
      target_customer_id: customerId,
      target_organization_id: organizationId,
    },
  );
  if (error) throw new Error("Cancellation failed.");
  return data as unknown as {
    ok: boolean;
    error?: string;
    refundReviewRequired?: boolean;
  };
}

export async function requestCustomerReschedule(
  organizationId: string,
  customerId: string,
  appointmentId: string,
  staffKey: string,
  startAt: string,
  submissionId: string,
  fingerprint: string,
) {
  const { data, error } = await createAdminClient().rpc(
    "request_customer_reschedule",
    {
      request_fingerprint: fingerprint,
      target_appointment_id: appointmentId,
      target_customer_id: customerId,
      target_organization_id: organizationId,
      target_staff_key: staffKey,
      target_start_at: startAt,
      target_submission_id: submissionId,
    },
  );
  if (error) throw new Error("Reschedule request failed.");
  return data as unknown as { ok: boolean; error?: string; requestId?: string };
}

export async function getPendingBookingCountsFromDatabase() {
  const client = await createServerClient();
  const { data, error } = await client.rpc("get_pending_booking_counts");
  if (error) return { publicBookings: 0, reschedules: 0 };
  return data as unknown as PendingBookingCounts;
}
