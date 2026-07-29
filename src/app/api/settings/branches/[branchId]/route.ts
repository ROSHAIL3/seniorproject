import { NextResponse } from "next/server";
import {
  BranchRepositoryError,
  deleteBranchFromDatabase,
  saveBranchInDatabase,
} from "@/server/branches.repository";
import { validateBranch } from "@/services/branches.service";
import type { BranchInput } from "@/types/branches";

type RouteContext = {
  params: Promise<{ branchId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { branchId } = await context.params;
  const input = (await request.json().catch(() => ({}))) as BranchInput;
  const fieldErrors = validateBranch(input);

  if (Object.keys(fieldErrors).length) {
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fieldErrors },
      { status: 400 },
    );
  }

  try {
    const branch = await saveBranchInDatabase(input, branchId);
    return NextResponse.json({ branch });
  } catch (error) {
    return branchErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { branchId } = await context.params;

  try {
    await deleteBranchFromDatabase(branchId);
    return NextResponse.json({ success: true });
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
