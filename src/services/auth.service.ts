export const AUTH_COOKIE_NAME = "seniorproject_mock_session";
export const AUTH_COOKIE_VALUE = "authenticated";
export const TEMPORARY_AUTH_BYPASS = true;

export const MOCK_CREDENTIALS = {
  email: "admin@demo.com",
  password: "Demo123!",
} as const;

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

export function authenticate(email: string, password: string): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    email.trim().toLowerCase() === MOCK_CREDENTIALS.email &&
    password === MOCK_CREDENTIALS.password
  );
}

export function register(email: string, password: string): boolean {
  return authenticate(email, password);
}

export function isAuthenticatedSession(value: string | undefined): boolean {
  return (
    process.env.NODE_ENV === "development" && value === AUTH_COOKIE_VALUE
  );
}
