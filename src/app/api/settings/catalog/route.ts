import { NextResponse } from "next/server";
import { getCatalogFromDatabase } from "@/server/catalog.repository";

export async function GET() {
  try {
    return NextResponse.json(await getCatalogFromDatabase());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Catalog could not be loaded." },
      { status: 400 },
    );
  }
}
