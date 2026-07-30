import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import PublicBookingClient from "@/components/public-booking/PublicBookingClient";
import { getPublicBookingPage } from "@/server/public-booking.repository";

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
    title: page ? `Book with ${page.organization.name}` : "Booking unavailable",
    description: page
      ? `Book an appointment online with ${page.organization.name}.`
      : "This booking page is unavailable.",
    robots: { follow: false, index: false },
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug).catch(() => null);
  if (!page) notFound();
  return <PublicBookingClient page={page} />;
}
