import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createPublicBooking } from "@/server/public-booking.repository";
import type { PublicBookingCreateInput } from "@/types/public-booking";

const noStore = {
  "Cache-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const input = (await request.json().catch(() => null)) as
    | PublicBookingCreateInput
    | null;

  if (!isValidInput(input)) {
    return NextResponse.json(
      { error: "Complete all required booking details." },
      { headers: noStore, status: 400 },
    );
  }

  try {
    const result = await createPublicBooking(
      slug,
      input,
      fingerprintRequest(request),
    );
    if (!result.ok) {
      const mapped = bookingError(result.error);
      return NextResponse.json(
        { error: mapped.message },
        { headers: noStore, status: mapped.status },
      );
    }
    return NextResponse.json(
      {
        bookingNumber: result.bookingNumber,
        referenceToken: result.referenceToken,
        status: result.status,
      },
      { headers: noStore, status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "The appointment could not be created. Please try again." },
      { headers: noStore, status: 500 },
    );
  }
}

function isValidInput(
  input: PublicBookingCreateInput | null,
): input is PublicBookingCreateInput {
  return Boolean(
    input &&
      /^[0-9a-f-]{36}$/i.test(input.branchId) &&
      input.serviceId &&
      input.staffKey &&
      !Number.isNaN(Date.parse(input.startAt)) &&
      input.customerName?.trim() &&
      input.customerPhone?.trim() &&
      /^[0-9a-f-]{36}$/i.test(input.submissionId) &&
      input.serviceFieldValues &&
      typeof input.serviceFieldValues === "object",
  );
}

function fingerprintRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") ?? "unknown";
  const secret =
    process.env.PUBLIC_BOOKING_RATE_LIMIT_SECRET ??
    process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Public booking rate limiting is not configured.");
  return createHmac("sha256", secret).update(`${address}|${agent}`).digest("hex");
}

function bookingError(code = "") {
  if (code === "BOOKING_RATE_LIMITED") {
    return {
      message: "Too many booking attempts. Please wait and try again.",
      status: 429,
    };
  }
  if (code === "BOOKING_SLOT_UNAVAILABLE") {
    return {
      message: "That time was just taken. Choose another available time.",
      status: 409,
    };
  }
  if (code.startsWith("SERVICE_FIELD_")) {
    return {
      message: "Complete the required service information.",
      status: 400,
    };
  }
  if (code === "BOOKING_CUSTOMER_CONFLICT") {
    return {
      message: "Those customer details conflict with an existing profile. Contact the business for help.",
      status: 409,
    };
  }
  if (code === "BOOKING_PAGE_NOT_FOUND") {
    return { message: "This booking page is unavailable.", status: 404 };
  }
  return {
    message: "The appointment could not be created. Please review your details.",
    status: 400,
  };
}

