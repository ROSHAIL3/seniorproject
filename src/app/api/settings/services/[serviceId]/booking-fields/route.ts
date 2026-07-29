import { NextResponse } from "next/server";
import {
  getServiceBookingFieldsFromDatabase,
  saveServiceBookingFieldsInDatabase,
} from "@/server/field-definitions.repository";
import type { ServiceBookingFieldDefinition } from "@/types/services";

type Context = { params: Promise<{ serviceId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { serviceId } = await context.params;
    const includeInactive =
      new URL(request.url).searchParams.get("includeInactive") === "true";
    return NextResponse.json({
      fields: await getServiceBookingFieldsFromDatabase(
        serviceId,
        includeInactive,
      ),
    });
  } catch (error) {
    return response(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { serviceId } = await context.params;
    const body = await request.json();
    return NextResponse.json({
      fields: await saveServiceBookingFieldsInDatabase(
        serviceId,
        body.fields as ServiceBookingFieldDefinition[],
      ),
    });
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Booking fields request failed." },
    { status: 400 },
  );
}
