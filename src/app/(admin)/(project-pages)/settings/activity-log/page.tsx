import ActivityLogPageClient from "@/components/settings/activity-log/ActivityLogPageClient";
import { getActivityLogs } from "@/services/activity-log.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity log | Senior Project",
};

export default async function Page() {
  return <ActivityLogPageClient initialLogs={await getActivityLogs()} />;
}
