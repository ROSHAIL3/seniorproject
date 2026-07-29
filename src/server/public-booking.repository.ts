import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { Json } from "@/types/database";
import type {
  PublicBookingConfirmation,
  PublicBookingCreateInput,
  PublicBookingPageData,
  PublicBookingSlot,
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

