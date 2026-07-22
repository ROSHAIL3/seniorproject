import { mockActivityLogs } from "@/data/mock/activity-logs";
import type { ActivityLog, ActivityLogInput } from "@/types/activity-log";

const activityRecords: ActivityLog[] = mockActivityLogs.map(cloneActivity);
const listeners = new Set<() => void>();

// Temporary actor context for the prototype. Replace this with the authenticated
// Supabase user when authentication is connected.
export const DEFAULT_ACTIVITY_ACTOR = {
  actorId: "staff-sophia",
  actorName: "Sophia Bennett",
  actorEmail: "owner@seniorproject.test",
} as const;

function cloneActivity(log: ActivityLog): ActivityLog {
  return {
    ...log,
    metadata: structuredClone(log.metadata),
    oldValues: log.oldValues ? structuredClone(log.oldValues) : undefined,
    newValues: log.newValues ? structuredClone(log.newValues) : undefined,
  };
}

export function subscribeToActivityLogs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return activityRecords
    .map(cloneActivity)
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt));
}

export async function logActivity(input: ActivityLogInput): Promise<ActivityLog> {
  const record: ActivityLog = {
    ...input,
    id: `activity-log-${crypto.randomUUID()}`,
    actorId: input.actorId ?? null,
    actorName: input.actorName.trim() || "System",
    metadata: structuredClone(input.metadata ?? {}),
    oldValues: input.oldValues ? structuredClone(input.oldValues) : undefined,
    newValues: input.newValues ? structuredClone(input.newValues) : undefined,
    occurredAt: new Date().toISOString(),
  };
  activityRecords.push(record);
  listeners.forEach((listener) => listener());
  return cloneActivity(record);
}
