import { NextResponse } from "next/server";
import { customerFieldHasDataInDatabase } from "@/server/field-definitions.repository";

type Context = { params: Promise<{ fieldId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const { fieldId } = await context.params;
    return NextResponse.json({
      hasData: await customerFieldHasDataInDatabase(fieldId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Field usage could not be checked." },
      { status: 400 },
    );
  }
}
