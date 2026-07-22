import Badge from "@/components/ui/badge/Badge";
import type { CustomerStatus } from "@/types/customers";

export default function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge size="sm" color={status === "Active" ? "success" : "light"}>
      {status}
    </Badge>
  );
}
