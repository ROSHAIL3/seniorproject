import NotificationsSettingsClient from "@/components/settings/notifications/NotificationsSettingsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function Page() {
  return <NotificationsSettingsClient />;
}
