import Badge from "@/components/ui/badge/Badge";
import type { InvoiceStatus } from "@/types/invoices";

export default function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const color =
    status === "Paid"
      ? "success"
      : status === "Partially Paid"
        ? "warning"
        : "error";

  return (
    <Badge size="sm" color={color}>
      {status}
    </Badge>
  );
}
