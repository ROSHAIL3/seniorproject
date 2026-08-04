import { NextResponse } from "next/server";
import { supabaseErrorHttpStatus } from "@/lib/supabase/error";
import { getNotificationsFromDatabase } from "@/server/notifications.repository";
import type { NotificationCategory } from "@/types/notifications";

const categories = new Set(["booking", "payment", "staff", "system"]);

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const categoryValue = query.get("category");
  if (categoryValue && !categories.has(categoryValue)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const createdAt = query.get("cursorCreatedAt");
  const id = query.get("cursorId");
  try {
    const page = await getNotificationsFromDatabase({
      category: (categoryValue as NotificationCategory | null) ?? null,
      cursor: createdAt && id ? { createdAt, id } : null,
      unreadOnly: query.get("unreadOnly") === "true",
    });
    return NextResponse.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Notifications could not be loaded." },
      { status: supabaseErrorHttpStatus(error) },
    );
  }
}
