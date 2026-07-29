import { NextResponse } from "next/server";
import {
  getAppointmentSettingsFromDatabase,
  updateBusinessHoursInDatabase,
} from "@/server/appointment-settings.repository";
import type { ScheduleDay } from "@/types/appointment-settings";

export async function GET() {
  try {
    return NextResponse.json({
      settings: await getAppointmentSettingsFromDatabase(),
    });
  } catch (error) {
    return response(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      businessHours: await updateBusinessHoursInDatabase(
        body.businessHours as ScheduleDay[],
      ),
    });
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Settings request failed." },
    { status: 400 },
  );
}
