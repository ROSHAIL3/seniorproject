import { NextResponse } from "next/server";
import {
  deleteExpenseFromDatabase,
  getExpenseByIdFromDatabase,
  saveExpenseInDatabase,
} from "@/server/expenses.repository";
import type { ExpenseUpdateInput } from "@/types/expenses";

type Context = { params: Promise<{ expenseId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { expenseId } = await context.params;
    return NextResponse.json({
      expense: await getExpenseByIdFromDatabase(expenseId),
    });
  } catch (error) {
    return response(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { expenseId } = await context.params;
    return NextResponse.json({
      expense: await saveExpenseInDatabase(
        (await request.json()) as ExpenseUpdateInput,
        expenseId,
      ),
    });
  } catch (error) {
    return response(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { expenseId } = await context.params;
    await deleteExpenseFromDatabase(expenseId);
    return NextResponse.json({ success: true });
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
