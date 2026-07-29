import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  LOGO_LIMIT_BYTES,
  LOGO_MIME_TYPES,
  OrganizationRepositoryError,
  removeOrganizationLogo,
  uploadOrganizationLogo,
} from "@/server/organization.repository";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
  Expires: "0",
  Pragma: "no-cache",
};

export async function PUT(request: Request) {
  const formData = await request.formData().catch(() => null);
  const logo = formData?.get("logo");

  if (!(logo instanceof File)) {
    return NextResponse.json(
      { error: "Choose a logo to upload." },
      { headers: noStoreHeaders, status: 400 },
    );
  }
  if (
    !LOGO_MIME_TYPES.includes(
      logo.type as (typeof LOGO_MIME_TYPES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error: "Choose a PNG, JPG or WebP image.",
        fieldErrors: { logo: "Choose a PNG, JPG or WebP image." },
      },
      { headers: noStoreHeaders, status: 400 },
    );
  }
  if (logo.size < 1 || logo.size > LOGO_LIMIT_BYTES) {
    return NextResponse.json(
      {
        error: "Logo must be 2 MB or smaller.",
        fieldErrors: { logo: "Logo must be 2 MB or smaller." },
      },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const organization = await uploadOrganizationLogo(logo, supabase);
    return NextResponse.json(
      { logo: organization.details.logo, storage: organization.storage },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return logoErrorResponse(error, "The logo upload failed.");
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const organization = await removeOrganizationLogo(supabase);
    return NextResponse.json(
      { logo: organization.details.logo, storage: organization.storage },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return logoErrorResponse(error, "The logo removal failed.");
  }
}

function logoErrorResponse(error: unknown, fallback: string) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    {
      headers: noStoreHeaders,
      status:
        error instanceof OrganizationRepositoryError && error.code === "401"
          ? 401
          : 500,
    },
  );
}
