import { NextResponse } from "next/server";
import {
  getExpensesFromDatabase,
  saveExpenseInDatabase,
} from "@/server/expenses.repository";
import type { ExpenseCreateInput } from "@/types/expenses";

export async function GET() {
  try {
    return NextResponse.json({ expenses: await getExpensesFromDatabase() });
  } catch (error) {
    return response(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      {
        expense: await saveExpenseInDatabase(
          (await request.json()) as ExpenseCreateInput,
          null,
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
    { error: error instanceof Error ? error.message : "Expense request failed." },
    { status: 400 },
  );
}
