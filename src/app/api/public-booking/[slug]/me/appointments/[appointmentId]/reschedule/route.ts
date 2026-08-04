import { NextResponse } from "next/server";
import { requestCustomerReschedule } from "@/server/public-booking.repository";
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
  const body = await request.json().catch(() => ({}));
  const branchId = String(body.branchId ?? "");
  const staffKey = String(body.staffKey ?? "");
  const startAt = String(body.startAt ?? "");
  const submissionId = String(body.submissionId ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(branchId) ||
    !staffKey ||
    Number.isNaN(Date.parse(startAt)) ||
    !/^[0-9a-f-]{36}$/i.test(submissionId)
  ) {
    return NextResponse.json({ error: "Choose a valid new time." }, { status: 400 });
  }
  const result = await requestCustomerReschedule(
    session.organizationId,
    session.customerId,
    appointmentId,
    branchId,
    staffKey,
    startAt,
    submissionId,
    fingerprintRequest(request),
  ).catch(() => null);
  if (!result?.ok) {
    const rateLimited = result?.error === "ACTION_RATE_LIMITED";
    return NextResponse.json(
      {
        error: rateLimited
          ? "Too many attempts. Please wait and try again."
          : result?.error === "SLOT_UNAVAILABLE"
            ? "That time is no longer available."
            : "This appointment can no longer be rescheduled online.",
      },
      { status: rateLimited ? 429 : 409 },
    );
  }
  return NextResponse.json({ ok: true, requestId: result.requestId });
}
