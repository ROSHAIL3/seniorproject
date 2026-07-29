import { NextResponse } from "next/server";
import {
  removeExpenseCategoryFromDatabase,
  saveExpenseCategoryInDatabase,
} from "@/server/expenses.repository";
import type { ExpenseCategoryInput } from "@/types/expenses";

type Context = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { categoryId } = await context.params;
    return NextResponse.json({
      category: await saveExpenseCategoryInDatabase(
        (await request.json()) as ExpenseCategoryInput,
        categoryId,
      ),
    });
  } catch (error) {
    return response(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { categoryId } = await context.params;
    return NextResponse.json({
      result: await removeExpenseCategoryFromDatabase(categoryId),
    });
  } catch (error) {
    return response(error);
  }
}

function response(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Expense category request failed." },
    { status: 400 },
  );
}
