import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActivityCategory, ActivityLog } from "@/types/activity-log";

export async function getActivityLogsFromDatabase(): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Activity logs could not be loaded.");
  return data.map((row) => ({
    action: row.action,
    actorEmail: row.actor_email ?? undefined,
    actorId: row.actor_user_id,
    actorName: row.actor_name,
    category: row.category as ActivityCategory,
    description: row.description ?? undefined,
    id: row.id,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    newValues: (row.new_values ?? undefined) as Record<string, unknown> | undefined,
    occurredAt: row.occurred_at,
    oldValues: (row.old_values ?? undefined) as Record<string, unknown> | undefined,
    source: row.source ?? undefined,
    targetId: row.target_id ?? undefined,
    targetType: row.target_type ?? undefined,
  }));
}
