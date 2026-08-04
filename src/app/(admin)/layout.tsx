import type { ReactNode } from "react";
import AdminShell from "@/layout/AdminShell";
import { getPendingBookingCountsFromDatabase } from "@/server/public-booking.repository";
import { getWorkspaceIdentityFromDatabase } from "@/server/workspace-identity.repository";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [identity, pending] = await Promise.all([
    getWorkspaceIdentityFromDatabase(),
    getPendingBookingCountsFromDatabase(),
  ]);
  return (
    <AdminShell
      identity={identity}
      pendingAppointmentRequestCount={pending.publicBookings}
    >
      {children}
    </AdminShell>
  );
}
