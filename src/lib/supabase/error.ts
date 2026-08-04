import "server-only";

type SupabaseErrorLike = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
  status?: unknown;
};

export class SupabaseOperationError extends Error {
  readonly code: string;
  readonly context: string;
  readonly databaseMessage: string;
  readonly status: number | null;

  constructor(context: string, publicMessage: string, error: unknown) {
    super(publicMessage, { cause: error });
    this.name = "SupabaseOperationError";
    this.context = context;
    this.code = errorValue(error, "code");
    this.databaseMessage = errorValue(error, "message");
    const status = Number(errorValue(error, "status"));
    this.status = Number.isInteger(status) && status >= 400 ? status : null;
  }
}

export function reportSupabaseError(context: string, error: unknown) {
  console.error(`[Supabase] ${context}`, {
    code: errorValue(error, "code") || "UNKNOWN",
    details: errorValue(error, "details") || undefined,
    hint: errorValue(error, "hint") || undefined,
    message:
      errorValue(error, "message") ||
      (error instanceof Error ? error.message : "Unknown Supabase error"),
    status: errorValue(error, "status") || undefined,
  });
}

export function supabaseOperationError(
  context: string,
  publicMessage: string,
  error: unknown,
) {
  reportSupabaseError(context, error);
  return new SupabaseOperationError(context, publicMessage, error);
}

export function supabaseErrorHttpStatus(error: unknown, fallback = 500) {
  if (!(error instanceof SupabaseOperationError)) return fallback;

  const searchable = `${error.code} ${error.databaseMessage}`.toUpperCase();
  if (searchable.includes("AUTH_REQUIRED") || searchable.includes("PGRST301")) {
    return 401;
  }
  if (
    searchable.includes("FORBIDDEN") ||
    searchable.includes("PERMISSION DENIED") ||
    error.code === "42501"
  ) {
    return 403;
  }
  if (searchable.includes("NOT_FOUND") || error.code === "PGRST116") {
    return 404;
  }
  if (
    searchable.includes("INVALID") ||
    searchable.includes("REQUIRED") ||
    error.code === "22P02" ||
    error.code === "23514"
  ) {
    return 400;
  }
  return error.status ?? fallback;
}

function errorValue(error: unknown, key: keyof SupabaseErrorLike) {
  if (!error || typeof error !== "object") return "";
  const value = (error as SupabaseErrorLike)[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}
