import { NextResponse } from "next/server";
import {
  getCustomerCustomValuesFromDatabase,
  getCustomerFromDatabase,
  removeCustomerFromDatabase,
  saveCustomerInDatabase,
} from "@/server/customers.repository";
import type { CustomerUpdateInput } from "@/types/customers";

type Context = { params: Promise<{ customerId: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const { customerId } = await context.params;
    const customer = await getCustomerFromDatabase(customerId);
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({
      customer,
      customFieldValues: await getCustomerCustomValuesFromDatabase(customerId),
    });
  } catch (error) {
    return response(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { customerId } = await context.params;
    const input = (await request.json()) as CustomerUpdateInput;
    return NextResponse.json({
      customer: await saveCustomerInDatabase(customerId, input),
    });
  } catch (error) {
    return response(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const { customerId } = await context.params;
    return NextResponse.json({
      result: await removeCustomerFromDatabase(customerId),
    });
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
