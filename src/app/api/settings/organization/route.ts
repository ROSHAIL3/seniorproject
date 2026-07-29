import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveOrganizationRow,
  getOrganizationFromDatabase,
  OrganizationRepositoryError,
} from "@/server/organization.repository";
import {
  validateBookingSlug,
  validateOrganizationDetails,
} from "@/services/organization.service";
import type {
  OrganizationDetails,
  PublicBookingSettings,
} from "@/types/organization";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
  Expires: "0",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const organization = await getOrganizationFromDatabase();
    return NextResponse.json(
      { organization },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return organizationErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const details = body.details as OrganizationDetails | undefined;
  const publicBooking = body.publicBooking as
    | Pick<PublicBookingSettings, "enabled" | "slug">
    | undefined;

  if (!details && !publicBooking) {
    return NextResponse.json(
      { error: "No organization changes were provided." },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const fieldErrors: Record<string, string> = {};
  if (details) Object.assign(fieldErrors, validateOrganizationDetails(details));

  if (publicBooking) {
    const slug = String(publicBooking.slug ?? "").trim().toLowerCase();
    const slugError = validateBookingSlug(slug);
    if (slugError) fieldErrors.slug = slugError;
  }

  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fieldErrors },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const current = await getActiveOrganizationRow(supabase);
    const update = details
      ? {
          address: details.address.trim() || null,
          business_email: details.businessEmail.trim().toLowerCase(),
          business_phone: details.businessPhone.trim(),
          country_code: details.country,
          currency_code: details.currency,
          name: details.name.trim(),
          time_zone: details.timeZone,
          website: details.website.trim() || null,
        }
      : {
          public_booking_enabled: Boolean(publicBooking?.enabled),
          slug: publicBooking!.slug.trim().toLowerCase(),
        };

    const { error } = await supabase
      .from("organizations")
      .update(update)
      .eq("id", current.id);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "That booking slug is already in use.",
            fieldErrors: { slug: "Choose a different booking slug." },
          },
          { headers: noStoreHeaders, status: 409 },
        );
      }
      throw new OrganizationRepositoryError(
        "The organization could not be updated.",
        error.code,
      );
    }

    const organization = await getOrganizationFromDatabase(supabase);
    return NextResponse.json(
      { organization },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return organizationErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const confirmationName = String(body.confirmationName ?? "");

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("soft_delete_organization", {
      confirmation_name: confirmationName,
    });

    if (error) {
      if (error.message.includes("ORGANIZATION_NAME_MISMATCH")) {
        return NextResponse.json(
          {
            error: "The organization name does not match.",
            fieldErrors: {
              confirmationName: "Enter the organization name exactly as shown.",
            },
          },
          { headers: noStoreHeaders, status: 400 },
        );
      }
      if (error.message.includes("ORGANIZATION_DELETE_FORBIDDEN")) {
        return NextResponse.json(
          { error: "Only the organization owner can delete this organization." },
          { headers: noStoreHeaders, status: 403 },
        );
      }
      throw new OrganizationRepositoryError(
        "The organization could not be deleted.",
        error.code,
      );
    }

    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      { success: true },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return organizationErrorResponse(error);
  }
}

function organizationErrorResponse(error: unknown) {
  if (
    error instanceof OrganizationRepositoryError &&
    error.code === "401"
  ) {
    return NextResponse.json(
      { error: error.message },
      { headers: noStoreHeaders, status: 401 },
    );
  }
  if (
    error instanceof OrganizationRepositoryError &&
    error.code === "404"
  ) {
    return NextResponse.json(
      { error: error.message },
      { headers: noStoreHeaders, status: 404 },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "The organization request failed.",
    },
    { headers: noStoreHeaders, status: 500 },
  );
}
