import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  AUTH_COOKIE_VALUE,
  authenticate,
} from "@/services/auth.service";

export async function POST(request: Request) {
  const { email = "", password = "" } = await request.json();

  if (!authenticate(String(email), String(password))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, AUTH_COOKIE_OPTIONS);
  return response;
}
