import { NextResponse } from "next/server";
import { getPublicBookingAvailability } from "@/server/public-booking.repository";

const noStore = {
  "Cache-Control": "no-store",
  Expires: "0",
  Pragma: "no-cache",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId") ?? "";
  const serviceId = url.searchParams.get("serviceId") ?? "";
  const date = url.searchParams.get("date") ?? "";

  if (
    !/^[0-9a-f-]{36}$/i.test(branchId) ||
    !serviceId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return NextResponse.json(
      { error: "Choose a valid branch, service and date." },
      { headers: noStore, status: 400 },
    );
  }

  try {
    const slots = await getPublicBookingAvailability(
      slug,
      branchId,
      serviceId,
      date,
    );
    return NextResponse.json({ slots }, { headers: noStore });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Availability could not be loaded.";
    return NextResponse.json(
      {
        error:
          message === "BOOKING_DATE_INVALID"
            ? "That booking date is unavailable."
            : message === "BOOKING_PAGE_NOT_FOUND"
              ? "This booking page is unavailable."
              : "Availability could not be loaded.",
      },
      {
        headers: noStore,
        status: message === "BOOKING_PAGE_NOT_FOUND" ? 404 : 400,
      },
    );
  }
}

