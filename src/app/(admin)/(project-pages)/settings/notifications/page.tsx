import NotificationsSettingsClient from "@/components/settings/notifications/NotificationsSettingsClient";
import type { Metadata } from "next";
import { getNotificationPreferencesFromDatabase } from "@/server/notifications.repository";

export const metadata: Metadata = {
  title: "Notifications | Senior Project",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialPreferences = await getNotificationPreferencesFromDatabase();
  return <NotificationsSettingsClient initialPreferences={initialPreferences} />;
}
