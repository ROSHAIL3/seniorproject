import { NextResponse } from "next/server";
import { savePackageInDatabase } from "@/server/catalog.repository";
import type { PackageInput } from "@/types/packages";

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
  const input = body.input as PackageInput;
  if (!input?.name?.trim() || !Array.isArray(input.items)) {
    return NextResponse.json({ error: "Package name and services are required." }, { status: 400 });
  }
  try {
    return NextResponse.json({ package: await savePackageInDatabase(id, input) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Package could not be saved." },
      { status: 400 },
    );
  }
}
