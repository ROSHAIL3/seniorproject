import { NextResponse } from "next/server";
import {
  getCustomerFieldDefinitionsFromDatabase,
  saveCustomerFieldDefinitionsInDatabase,
} from "@/server/field-definitions.repository";
import type { CustomerFieldDefinition } from "@/types/customer-fields";

export async function GET() {
  try {
    return NextResponse.json({
      fields: await getCustomerFieldDefinitionsFromDatabase(),
    });
  } catch (error) {
    return response(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      fields: await saveCustomerFieldDefinitionsInDatabase(
        body.fields as CustomerFieldDefinition[],
      ),
    });
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Customer fields request failed." },
    { status: 400 },
  );
}
