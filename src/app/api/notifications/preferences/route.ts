import { NextResponse } from "next/server";
import { supabaseErrorHttpStatus } from "@/lib/supabase/error";
import {
  getNotificationPreferencesFromDatabase,
  updateNotificationPreferencesInDatabase,
} from "@/server/notifications.repository";
import type { NotificationPreferences } from "@/types/notifications";

export async function GET() {
  try {
    return NextResponse.json(await getNotificationPreferencesFromDatabase(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Notification preferences could not be loaded." },
      { status: supabaseErrorHttpStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const retentionDays = Number(body.retentionDays);
  if (
    !Number.isInteger(retentionDays) ||
    retentionDays < 7 ||
    retentionDays > 90
  ) {
    return NextResponse.json(
      { error: "Retention must be between 7 and 90 days." },
      { status: 400 },
    );
  }
  const preferences: NotificationPreferences = {
    bookingEnabled: body.bookingEnabled !== false,
    paymentEnabled: body.paymentEnabled !== false,
    retentionDays,
    staffEnabled: body.staffEnabled !== false,
    systemEnabled: body.systemEnabled !== false,
  };
  try {
    return NextResponse.json(
      await updateNotificationPreferencesInDatabase(preferences),
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Notification preferences could not be saved." },
      { status: supabaseErrorHttpStatus(error) },
    );
  }
}
