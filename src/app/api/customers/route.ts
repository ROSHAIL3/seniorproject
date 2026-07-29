import { NextResponse } from "next/server";
import {
  getCustomersFromDatabase,
  saveCustomerInDatabase,
} from "@/server/customers.repository";
import type { CustomerCreateInput } from "@/types/customers";

export async function GET() {
  try {
    return NextResponse.json({ customers: await getCustomersFromDatabase() });
  } catch (error) {
    return response(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CustomerCreateInput;
    return NextResponse.json(
      { customer: await saveCustomerInDatabase(null, input) },
      { status: 201 },
    );
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Customer request failed." },
    { status: 400 },
  );
}
