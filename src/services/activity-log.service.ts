import type { ActivityLog, ActivityLogInput } from "@/types/activity-log";

export const DEFAULT_ACTIVITY_ACTOR = {
  actorId: null,
  actorName: "Authenticated user",
} as const;

export function subscribeToActivityLogs(onChange?: () => void) {
  void onChange;
  return () => undefined;
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const response = await fetch("/api/settings/activity-log", { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Activity logs could not be loaded.");
  return body.logs;
}

export async function logActivity(input: ActivityLogInput): Promise<ActivityLog> {
  const response = await fetch("/api/settings/activity-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Activity could not be recorded.");
  return {
    ...input,
    actorId: null,
    actorName: input.actorName || "Authenticated user",
    id: body.id,
    metadata: input.metadata ?? {},
    occurredAt: new Date().toISOString(),
  };
}
