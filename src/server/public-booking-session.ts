import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { CustomerBookingSession } from "@/types/public-booking";

const SESSION_SECONDS = 30 * 60;

function secret() {
  const value =
    process.env.PUBLIC_BOOKING_RATE_LIMIT_SECRET ??
    process.env.SUPABASE_SECRET_KEY;
  if (!value) throw new Error("Public booking session security is not configured.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function cookieName(slug: string) {
  const suffix = createHmac("sha256", secret())
    .update(slug.toLowerCase())
    .digest("hex")
    .slice(0, 12);
  return `slotova-customer-${suffix}`;
}

export function fingerprintRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") ?? "unknown";
  return createHmac("sha256", secret())
    .update(`${address}|${agent}`)
    .digest("hex");
}

export async function createCustomerBookingSession(
  value: Omit<CustomerBookingSession, "expiresAt"> & { slug: string },
) {
  const { slug, ...identifiers } = value;
  const session: CustomerBookingSession = {
    ...identifiers,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const store = await cookies();
  store.set(cookieName(slug), `${payload}.${signature(payload)}`, {
    httpOnly: true,
    maxAge: SESSION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getCustomerBookingSession(slug: string) {
  const token = (await cookies()).get(cookieName(slug))?.value;
  if (!token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (
    supplied.length !== expectedBuffer.length ||
    !timingSafeEqual(supplied, expectedBuffer)
  ) {
    return null;
  }
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as CustomerBookingSession;
    if (
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearCustomerBookingSession(slug: string) {
  (await cookies()).delete(cookieName(slug));
}
