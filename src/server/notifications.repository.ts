import "server-only";

import { createClient } from "@/lib/supabase/server";
import { supabaseOperationError } from "@/lib/supabase/error";
import type {
  NotificationCategory,
  NotificationPage,
  NotificationPreferences,
} from "@/types/notifications";

export async function getNotificationsFromDatabase(options?: {
  category?: NotificationCategory | null;
  unreadOnly?: boolean;
  cursor?: { createdAt: string; id: string } | null;
}) {
  const client = await createClient();
  const { data, error } = await client.rpc("get_my_notifications", {
    filter_category: options?.category ?? null,
    unread_only: options?.unreadOnly ?? false,
    cursor_created_at: options?.cursor?.createdAt ?? null,
    cursor_id: options?.cursor?.id ?? null,
    page_limit: 20,
  });
  if (error) {
    throw supabaseOperationError(
      "notifications.list",
      "Notifications could not be loaded.",
      error,
    );
  }
  return data as unknown as NotificationPage;
}

export async function markNotificationReadInDatabase(id: string) {
  const client = await createClient();
  const { data, error } = await client.rpc("mark_notification_read", {
    target_notification_id: id,
  });
  if (error) {
    throw supabaseOperationError(
      "notifications.markRead",
      "Notification could not be updated.",
      error,
    );
  }
  if (!data) throw new Error("Notification could not be found.");
  return true;
}

export async function markAllNotificationsReadInDatabase() {
  const client = await createClient();
  const { data, error } = await client.rpc("mark_all_notifications_read");
  if (error) {
    throw supabaseOperationError(
      "notifications.markAllRead",
      "Notifications could not be updated.",
      error,
    );
  }
  return data;
}

export async function getNotificationPreferencesFromDatabase() {
  const client = await createClient();
  const { data, error } = await client.rpc("get_notification_preferences");
  if (error) {
    throw supabaseOperationError(
      "notifications.preferences.load",
      "Notification preferences could not be loaded.",
      error,
    );
  }
  if (!data) throw new Error("Notification preferences could not be found.");
  return mapPreferences(data);
}

export async function updateNotificationPreferencesInDatabase(
  preferences: NotificationPreferences,
) {
  const client = await createClient();
  const { data, error } = await client.rpc("update_notification_preferences", {
    target_booking_enabled: preferences.bookingEnabled,
    target_payment_enabled: preferences.paymentEnabled,
    target_retention_days: preferences.retentionDays,
    target_staff_enabled: preferences.staffEnabled,
    target_system_enabled: preferences.systemEnabled,
  });
  if (error) {
    throw supabaseOperationError(
      "notifications.preferences.update",
      "Notification preferences could not be saved.",
      error,
    );
  }
  if (!data) throw new Error("Notification preferences could not be saved.");
  return mapPreferences(data);
}

function mapPreferences(row: {
  booking_enabled: boolean;
  payment_enabled: boolean;
  retention_days: number;
  staff_enabled: boolean;
  system_enabled: boolean;
}): NotificationPreferences {
  return {
    bookingEnabled: row.booking_enabled,
    paymentEnabled: row.payment_enabled,
    retentionDays: row.retention_days,
    staffEnabled: row.staff_enabled,
    systemEnabled: row.system_enabled,
  };
}
