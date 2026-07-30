import { NextResponse } from "next/server";
import { cancelCustomerAppointment } from "@/server/public-booking.repository";
import {
  fingerprintRequest,
  getCustomerBookingSession,
} from "@/server/public-booking-session";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; appointmentId: string }> },
) {
  const { slug, appointmentId } = await context.params;
  const session = await getCustomerBookingSession(slug);
  if (!session) return NextResponse.json({ error: "Session expired." }, { status: 401 });
  const result = await cancelCustomerAppointment(
    session.organizationId,
    session.customerId,
    appointmentId,
    fingerprintRequest(request),
  ).catch(() => null);
  if (!result?.ok) {
    return NextResponse.json(
      {
        error:
          result?.error === "ACTION_RATE_LIMITED"
            ? "Too many attempts. Please wait and try again."
            : "This appointment can no longer be cancelled online.",
      },
      { status: result?.error === "ACTION_RATE_LIMITED" ? 429 : 409 },
    );
  }
  return NextResponse.json({
    ok: true,
    refundReviewRequired: Boolean(result.refundReviewRequired),
  });
}

