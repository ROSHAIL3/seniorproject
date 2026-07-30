import { NextResponse } from "next/server";
import { markAllNotificationsReadInDatabase } from "@/server/notifications.repository";

export async function POST() {
  try {
    const changed = await markAllNotificationsReadInDatabase();
    return NextResponse.json({ changed });
  } catch {
    return NextResponse.json(
      { error: "Notifications could not be updated." },
      { status: 401 },
    );
  }
}
