import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await context.params;
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
    "decide_public_booking",
    {
      decision,
      decision_reason: reason,
      target_appointment_id: appointmentId,
    },
  );
  if (error || !data) {
    return NextResponse.json(
      {
        error: error?.message.includes("DECISION_REASON")
          ? "Enter a rejection reason of 3 to 500 characters."
          : "The booking decision could not be saved.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ appointment: data });
}
