import { NextResponse } from "next/server";
import {
  BranchRepositoryError,
  getBranchesFromDatabase,
  saveBranchInDatabase,
} from "@/server/branches.repository";
import { validateBranch } from "@/services/branches.service";
import type { BranchInput } from "@/types/branches";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
  Expires: "0",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const branches = await getBranchesFromDatabase();
    return NextResponse.json({ branches }, { headers: noStoreHeaders });
  } catch (error) {
    return branchErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as BranchInput;
  const fieldErrors = validateBranch(input);

  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fieldErrors },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  try {
    const branch = await saveBranchInDatabase(input, null);
    return NextResponse.json(
      { branch },
      { headers: noStoreHeaders, status: 201 },
    );
  } catch (error) {
    return branchErrorResponse(error);
  }
}

function branchErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "The branch request failed.";
  const duplicate = message.includes("already exists");

  return NextResponse.json(
    duplicate
      ? { error: message, fieldErrors: { name: message } }
      : { error: message },
    {
      headers: noStoreHeaders,
      status:
        error instanceof BranchRepositoryError && error.code === "401"
          ? 401
          : error instanceof BranchRepositoryError &&
              error.message.includes("permission")
            ? 403
            : duplicate
              ? 409
              : 400,
    },
  );
}
