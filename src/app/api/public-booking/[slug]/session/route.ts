import { NextResponse } from "next/server";
import {
  authenticateCustomerBookingLink,
  authenticateCustomerBookings,
} from "@/server/public-booking.repository";
import {
  clearCustomerBookingSession,
  createCustomerBookingSession,
  fingerprintRequest,
} from "@/server/public-booking-session";

const headers = { "Cache-Control": "no-store" };

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim();
  const accessCode = String(body.accessCode ?? "")
    .replace(/\s/g, "")
    .toUpperCase();
  if (!phone || !accessCode || accessCode.length > 32) return invalid(401);
  try {
    const result = await authenticateCustomerBookings(
      slug,
      phone,
      accessCode,
      fingerprintRequest(request),
    );
    if (!result.ok || !result.organizationId || !result.customerId) {
      return invalid(result.error === "ACCESS_RATE_LIMITED" ? 429 : 401);
    }
    await createCustomerBookingSession({
      customerId: result.customerId,
      organizationId: result.organizationId,
      slug,
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return invalid(401);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => ({}));
  const token = String(body.referenceToken ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return invalid(400);
  try {
    const result = await authenticateCustomerBookingLink(
      slug,
      token,
      fingerprintRequest(request),
    );
    if (!result.ok || !result.organizationId || !result.customerId) {
      return invalid(result.error === "ACCESS_RATE_LIMITED" ? 429 : 401);
    }
    await createCustomerBookingSession({
      customerId: result.customerId,
      organizationId: result.organizationId,
      slug,
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return invalid(401);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  await clearCustomerBookingSession(slug);
  return NextResponse.json({ ok: true }, { headers });
}

function invalid(status: number) {
  return NextResponse.json(
    {
      error:
        status === 429
          ? "Too many attempts. Please wait and try again."
          : "The phone number or access code is invalid.",
    },
    { headers, status },
  );
}
