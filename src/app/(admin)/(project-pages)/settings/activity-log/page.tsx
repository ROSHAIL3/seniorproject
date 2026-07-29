import ActivityLogPageClient from "@/components/settings/activity-log/ActivityLogPageClient";
import { getActivityLogsFromDatabase } from "@/server/activity-log.repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity log | Senior Project",
};

export default async function Page() {
  return (
    <div className="space-y-4">
      <ActivityLogPageClient initialLogs={await getActivityLogsFromDatabase()} />
    </div>
  );
}
