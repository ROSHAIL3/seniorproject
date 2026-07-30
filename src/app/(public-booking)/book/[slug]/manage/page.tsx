import { notFound } from "next/navigation";
import CustomerBookingsClient from "@/components/public-booking/CustomerBookingsClient";
import { getPublicBookingPage } from "@/server/public-booking.repository";
import { getCustomerBookingSession } from "@/server/public-booking-session";

export const dynamic = "force-dynamic";

export default async function CustomerBookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, session] = await Promise.all([
    getPublicBookingPage(slug).catch(() => null),
    getCustomerBookingSession(slug),
  ]);
  if (!page) notFound();
  return (
    <CustomerBookingsClient
      page={page}
      initiallyAuthenticated={Boolean(session)}
    />
  );
}
