import { NextResponse } from "next/server";
import { saveServiceInDatabase } from "@/server/catalog.repository";
import type { ServiceInput } from "@/types/services";

export async function POST(request: Request) {
  return save(request, null);
}
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  return saveBody(body, String(body.id ?? ""));
}
async function save(request: Request, id: string | null) {
  return saveBody(await request.json().catch(() => ({})), id);
}
async function saveBody(body: Record<string, unknown>, id: string | null) {
  const input = body.input as ServiceInput;
  if (!input?.name?.trim() || !input.categoryId) {
    return NextResponse.json({ error: "Name and category are required." }, { status: 400 });
  }
  try {
    return NextResponse.json({ service: await saveServiceInDatabase(id, input) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Service could not be saved." },
      { status: 400 },
    );
  }
}
