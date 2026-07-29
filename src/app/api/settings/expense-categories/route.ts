import { NextResponse } from "next/server";
import {
  getExpenseCategoriesFromDatabase,
  saveExpenseCategoryInDatabase,
} from "@/server/expenses.repository";
import type { ExpenseCategoryInput } from "@/types/expenses";

export async function GET() {
  try {
    return NextResponse.json({
      categories: await getExpenseCategoriesFromDatabase(),
    });
  } catch (error) {
    return response(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      {
        category: await saveExpenseCategoryInDatabase(
          (await request.json()) as ExpenseCategoryInput,
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
    { error: error instanceof Error ? error.message : "Expense category request failed." },
    { status: 400 },
  );
}
