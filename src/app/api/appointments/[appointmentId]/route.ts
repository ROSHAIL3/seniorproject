import { NextResponse } from "next/server";
import {
  deleteAppointmentFromDatabase,
  getAppointmentServiceValuesFromDatabase,
  saveAppointmentInDatabase,
  setAppointmentPaymentInDatabase,
  setAppointmentStatusInDatabase,
} from "@/server/appointments.repository";
import type { AppointmentCreateInput, AppointmentStatus } from "@/types/appointments";

type Context = { params: Promise<{ appointmentId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const { appointmentId } = await context.params;
    return NextResponse.json({
      serviceFieldValues:
        await getAppointmentServiceValuesFromDatabase(appointmentId),
    });
  } catch (error) {
    return response(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { appointmentId } = await context.params;
    const body = await request.json();
    if (body.kind === "status") {
      return NextResponse.json({
        appointment: await setAppointmentStatusInDatabase(
          appointmentId,
          body.status as AppointmentStatus,
        ),
      });
    }
    if (body.kind === "payment") {
      return NextResponse.json({
        appointment: await setAppointmentPaymentInDatabase(
          appointmentId,
          Number(body.amountBhd),
        ),
      });
    }
    return NextResponse.json({
      appointment: await saveAppointmentInDatabase(
        appointmentId,
        body.input as AppointmentCreateInput,
      ),
    });
  } catch (error) {
    return response(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const { appointmentId } = await context.params;
    await deleteAppointmentFromDatabase(appointmentId);
    return new NextResponse(null, { status: 204 });
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
