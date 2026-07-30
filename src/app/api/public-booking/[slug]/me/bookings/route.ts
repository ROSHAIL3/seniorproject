import { NextResponse } from "next/server";
import { getCustomerBookings } from "@/server/public-booking.repository";
import { getCustomerBookingSession } from "@/server/public-booking-session";
import type { CustomerBookingScope } from "@/types/public-booking";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const session = await getCustomerBookingSession(slug);
  if (!session) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") as CustomerBookingScope;
  if (!["upcoming", "history", "cancelled"].includes(scope)) {
    return NextResponse.json({ error: "Invalid booking scope." }, { status: 400 });
  }
  const startsAt = url.searchParams.get("cursorStartsAt");
  const id = url.searchParams.get("cursorId");
  try {
    const page = await getCustomerBookings(
      session.organizationId,
      session.customerId,
      scope,
      startsAt && id ? { startsAt, id } : null,
    );
    return NextResponse.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Bookings could not be loaded." }, { status: 500 });
  }
}

