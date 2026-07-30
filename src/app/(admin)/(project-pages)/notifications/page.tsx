import type { Metadata } from "next";
import NotificationsInboxClient from "@/components/notifications/NotificationsInboxClient";
import { getNotificationsFromDatabase } from "@/server/notifications.repository";

export const metadata: Metadata = {
  title: "Notifications",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const initialPage = await getNotificationsFromDatabase();
  return <NotificationsInboxClient initialPage={initialPage} />;
}
