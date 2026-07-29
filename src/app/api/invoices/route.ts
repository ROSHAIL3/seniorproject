import { NextResponse } from "next/server";
import {
  createInvoiceInDatabase,
  getInvoicesFromDatabase,
} from "@/server/invoices.repository";

export async function GET() {
  try {
    return NextResponse.json({ invoices: await getInvoicesFromDatabase() });
  } catch (error) {
    return response(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoice = await createInvoiceInDatabase(
      Array.isArray(body.appointmentIds) ? body.appointmentIds.map(String) : [],
      String(body.issuedOn ?? ""),
      String(body.createdBy ?? ""),
    );
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Invoice request failed." },
    { status: 400 },
  );
}
