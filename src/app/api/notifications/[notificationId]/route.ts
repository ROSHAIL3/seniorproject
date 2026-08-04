import { NextResponse } from "next/server";
import { supabaseErrorHttpStatus } from "@/lib/supabase/error";
import { markNotificationReadInDatabase } from "@/server/notifications.repository";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) {
    return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
  }
  try {
    await markNotificationReadInDatabase(notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Notification could not be updated." },
      { status: supabaseErrorHttpStatus(error, 404) },
    );
  }
}
