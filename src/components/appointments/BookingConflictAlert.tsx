import Alert from "@/components/ui/alert/Alert";
import type { BookingValidationError } from "./types";

type BookingConflictAlertProps = {
  errors: BookingValidationError[];
};

export default function BookingConflictAlert({
  errors,
}: BookingConflictAlertProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2" role="alert" aria-live="assertive">
      {errors.map((error) => (
        <Alert
          key={error.code}
          variant="error"
          title="Booking conflict"
          message={error.message}
        />
      ))}
    </div>
  );
}
