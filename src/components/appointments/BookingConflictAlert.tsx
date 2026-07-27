import type { BookingValidationError } from "./types";

type BookingConflictAlertProps = {
  errors: BookingValidationError[];
};

export default function BookingConflictAlert({
  errors,
}: BookingConflictAlertProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
      role="alert"
      aria-live="assertive"
    >
      <p className="font-semibold">Resolve before saving</p>
      <ul className="mt-1 space-y-0.5">
        {errors.map((error) => (
          <li key={error.code}>• {error.message}</li>
        ))}
      </ul>
    </div>
  );
}
