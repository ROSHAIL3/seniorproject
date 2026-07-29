import { NextResponse } from "next/server";
import {
  archiveOrDeleteCategoryInDatabase,
  saveCategoryInDatabase,
} from "@/server/catalog.repository";
import type { ServiceCategoryInput } from "@/types/services";

export async function POST(request: Request) {
  return save(request, null);
}
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  return saveBody(body, String(body.id ?? ""));
}
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json({
      result: await archiveOrDeleteCategoryInDatabase(String(body.id ?? "")),
    });
  } catch (error) {
    return failure(error);
  }
}
async function save(request: Request, id: string | null) {
  return saveBody(await request.json().catch(() => ({})), id);
}
async function saveBody(body: Record<string, unknown>, id: string | null) {
  const input = body.input as ServiceCategoryInput;
  if (!input?.name?.trim()) {
    return NextResponse.json({ fieldErrors: { name: "Category name is required." } }, { status: 400 });
  }
  try {
    return NextResponse.json({ category: await saveCategoryInDatabase(id, input) });
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Category could not be saved." },
    { status: 400 },
  );
}
