import { NextResponse } from "next/server";
import {
  addAppointmentNoteInDatabase,
  getAppointmentActivityFromDatabase,
} from "@/server/appointments.repository";

type Context = { params: Promise<{ appointmentId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const { appointmentId } = await context.params;
    return NextResponse.json({
      activity: await getAppointmentActivityFromDatabase(appointmentId),
    });
  } catch (error) {
    return response(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { appointmentId } = await context.params;
    const body = await request.json();
    return NextResponse.json(
      {
        activity: await addAppointmentNoteInDatabase(
          appointmentId,
          String(body.note ?? ""),
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Activity request failed." },
    { status: 400 },
  );
}
