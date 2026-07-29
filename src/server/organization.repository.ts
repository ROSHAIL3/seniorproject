import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  Organization,
  OrganizationLogo,
} from "@/types/organization";

const LOGO_BUCKET = "organization-logos";
export const LOGO_LIMIT_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

type OrganizationRow =
  Database["public"]["Tables"]["organizations"]["Row"];

export class OrganizationRepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function getOrganizationFromDatabase(
  client?: SupabaseClient<Database>,
): Promise<Organization> {
  const supabase = client ?? (await createClient());
  const [{ data: userData, error: userError }, { data, error }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("organizations")
        .select("*")
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
    ]);

  if (userError || !userData.user) {
    throw new OrganizationRepositoryError("Authentication is required.", "401");
  }
  if (error) {
    throw new OrganizationRepositoryError(
      "The organization could not be loaded.",
      error.code,
    );
  }
  if (!data) {
    throw new OrganizationRepositoryError(
      "No active organization is available for this account.",
      "404",
    );
  }

  return mapOrganization(supabase, data);
}

async function mapOrganization(
  supabase: SupabaseClient<Database>,
  row: OrganizationRow,
): Promise<Organization> {
  let logo: OrganizationLogo | undefined;

  if (
    row.logo_object_path &&
    row.logo_file_name &&
    row.logo_mime_type &&
    row.logo_size_bytes
  ) {
    const { data } = await supabase.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(row.logo_object_path, 60 * 60);

    if (data?.signedUrl) {
      logo = {
        fileName: row.logo_file_name,
        mimeType: row.logo_mime_type,
        objectPath: row.logo_object_path,
        sizeBytes: row.logo_size_bytes,
        url: data.signedUrl,
      };
    }
  }

  const businessEmail = row.business_email ?? "";
  const { data: emailVerified } = await supabase.rpc(
    "is_organization_business_email_verified",
    { target_organization_id: row.id },
  );

  const bookingBase = `${
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  }/book`;

  return {
    createdAt: row.created_at,
    details: {
      address: row.address ?? "",
      businessEmail,
      businessPhone: row.business_phone ?? "",
      country: row.country_code,
      currency: row.currency_code,
      emailVerified: Boolean(emailVerified),
      logo,
      name: row.name,
      timeZone: row.time_zone,
      website: row.website ?? "",
    },
    id: row.id,
    publicBooking: {
      baseUrl: bookingBase,
      enabled: row.public_booking_enabled,
      slug: row.slug,
    },
    status: row.status === "deleted" ? "Deleted" : "Active",
    storage: {
      limitBytes: LOGO_LIMIT_BYTES,
      uploadedFileCount: logo ? 1 : 0,
      usedBytes: logo?.sizeBytes ?? 0,
    },
    updatedAt: row.updated_at,
  };
}

export async function getActiveOrganizationRow(
  supabase: SupabaseClient<Database>,
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new OrganizationRepositoryError("Authentication is required.", "401");
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new OrganizationRepositoryError(
      "No active organization is available for this account.",
      error?.code ?? "404",
    );
  }

  return data;
}

export async function uploadOrganizationLogo(
  file: File,
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const organization = await getActiveOrganizationRow(supabase);
  const objectPath = `${organization.id}/logo`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new OrganizationRepositoryError(
      "The logo could not be uploaded.",
      uploadError.message,
    );
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      logo_file_name: file.name,
      logo_mime_type: file.type,
      logo_object_path: objectPath,
      logo_size_bytes: file.size,
    })
    .eq("id", organization.id);

  if (updateError) {
    throw new OrganizationRepositoryError(
      "The logo metadata could not be saved.",
      updateError.code,
    );
  }

  return getOrganizationFromDatabase(supabase);
}

export async function removeOrganizationLogo(
  client?: SupabaseClient<Database>,
) {
  const supabase = client ?? (await createClient());
  const organization = await getActiveOrganizationRow(supabase);
  const oldPath = organization.logo_object_path;

  const { error } = await supabase
    .from("organizations")
    .update({
      logo_file_name: null,
      logo_mime_type: null,
      logo_object_path: null,
      logo_size_bytes: null,
    })
    .eq("id", organization.id);

  if (error) {
    throw new OrganizationRepositoryError(
      "The logo could not be removed.",
      error.code,
    );
  }

  if (oldPath) {
    await supabase.storage.from(LOGO_BUCKET).remove([oldPath]);
  }

  return getOrganizationFromDatabase(supabase);
}
