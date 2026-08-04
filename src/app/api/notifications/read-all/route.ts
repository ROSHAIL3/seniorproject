import { NextResponse } from "next/server";
import { supabaseErrorHttpStatus } from "@/lib/supabase/error";
import { markAllNotificationsReadInDatabase } from "@/server/notifications.repository";

export async function POST() {
  try {
    const changed = await markAllNotificationsReadInDatabase();
    return NextResponse.json({ changed });
  } catch (error) {
    return NextResponse.json(
      { error: "Notifications could not be updated." },
      { status: supabaseErrorHttpStatus(error) },
    );
  }
}
