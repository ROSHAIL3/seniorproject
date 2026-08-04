import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision = String(body.decision ?? "");
  const reason = String(body.reason ?? "");
  if (!["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }
  if (decision === "reject" && (reason.trim().length < 3 || reason.trim().length > 500)) {
    return NextResponse.json(
      { error: "Enter a rejection reason of 3 to 500 characters." },
      { status: 400 },
    );
  }
  const { data, error } = await (await createClient()).rpc(
    "decide_reschedule_request",
    { decision, decision_reason: reason, target_request_id: requestId },
  );
  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message.includes("DECISION_REASON_REQUIRED")
          ? "Enter a rejection reason of 3 to 500 characters."
          : error?.message.includes("CONFLICT")
            ? "The proposed time is no longer available."
            : "The reschedule decision could not be saved.",
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ request: data });
}
