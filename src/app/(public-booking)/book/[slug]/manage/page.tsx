import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import CustomerBookingsClient from "@/components/public-booking/CustomerBookingsClient";
import { getPublicBookingPage } from "@/server/public-booking.repository";
import { getCustomerBookingSession } from "@/server/public-booking-session";

export const dynamic = "force-dynamic";
const getPage = cache(getPublicBookingPage);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug).catch(() => null);
  return {
    title: page ? `My bookings with ${page.organization.name}` : "My bookings",
    description: page
      ? `Securely view and manage appointments with ${page.organization.name}.`
      : "Securely view and manage appointments.",
    robots: { follow: false, index: false },
  };
}

export default async function CustomerBookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, session] = await Promise.all([
    getPage(slug).catch(() => null),
    getCustomerBookingSession(slug),
  ]);
  if (!page) notFound();
  if (!page.organization.publicBookingEnabled) {
    redirect(`/book/${encodeURIComponent(slug)}`);
  }
  return (
    <CustomerBookingsClient
      page={page}
      initiallyAuthenticated={Boolean(session)}
    />
  );
}
