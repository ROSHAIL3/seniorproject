export const activityCategories = [
  "Account",
  "Customers & Appointments",
  "Catalog & Team",
  "Finance",
  "Expenses",
  "Settings",
  "Notifications",
  "Billing",
  "System",
] as const;

export type ActivityCategory = (typeof activityCategories)[number];
export type ActivityValues = Record<string, unknown>;

export type ActivityLog = {
  id: string;
  action: string;
  category: ActivityCategory;
  actorId: string | null;
  actorName: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata: ActivityValues;
  oldValues?: ActivityValues;
  newValues?: ActivityValues;
  ipAddress?: string;
  source?: string;
  occurredAt: string;
};

export type ActivityLogInput = Omit<ActivityLog, "id" | "occurredAt" | "metadata"> & {
  metadata?: ActivityValues;
};
