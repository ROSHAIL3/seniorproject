import Badge from "@/components/ui/badge/Badge";
import type { AppointmentStatus } from "./types";

type AppointmentStatusBadgeProps = {
  status: AppointmentStatus;
};

export default function AppointmentStatusBadge({
  status,
}: AppointmentStatusBadgeProps) {
  const color =
    status === "Booked"
      ? "primary"
      : status === "Confirmed" || status === "Completed"
        ? "success"
        : status === "Cancelled"
          ? "error"
          : "warning";

  return (
    <Badge size="sm" color={color}>
      {status}
    </Badge>
  );
}
