import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  AUTH_COOKIE_VALUE,
  register,
} from "@/services/auth.service";

export async function POST(request: Request) {
  const { email = "", password = "" } = await request.json();

  if (!register(String(email), String(password))) {
    return NextResponse.json(
      { error: "Use the development mock credentials to sign up." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, AUTH_COOKIE_OPTIONS);
  return response;
}
