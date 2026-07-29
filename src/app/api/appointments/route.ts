import { NextResponse } from "next/server";
import {
  getAppointmentsFromDatabase,
  saveAppointmentInDatabase,
} from "@/server/appointments.repository";
import type { AppointmentCreateInput } from "@/types/appointments";

export async function GET() {
  try {
    return NextResponse.json({ appointments: await getAppointmentsFromDatabase() });
  } catch (error) {
    return response(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as AppointmentCreateInput;
    return NextResponse.json(
      { appointment: await saveAppointmentInDatabase(null, input) },
      { status: 201 },
    );
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Appointment request failed." },
    { status: 400 },
  );
}
