import Link from "next/link";
import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardEmptyState from "./DashboardEmptyState";
import type { Invoice } from "./types";
import type { InvoiceStatus } from "@/types/invoices";
import { formatBhd } from "@/lib/formatters";

type RecentInvoicesProps = {
  invoices: Invoice[];
};

const statusColor = (status: InvoiceStatus) => {
  if (status === "Paid") return "success" as const;
  if (status === "Partially Paid") return "warning" as const;
  return "error" as const;
};

export default function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <ComponentCard
      title="Recent Invoices"
      className="h-full"
      bodyClassName="p-0"
      action={
        <Link
          href="/invoices"
          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View All
        </Link>
      }
    >
      {invoices.length > 0 ? (
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {['Invoice Number', 'Customer', 'Total', 'Status'].map(
                  (heading) => (
                    <TableCell
                      key={heading}
                      isHeader
                      className="px-6 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {heading}
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-medium text-brand-500 dark:text-brand-400">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-800 dark:text-white/90">
                    {invoice.customerName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {formatBhd(invoice.totalBhd)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={statusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <DashboardEmptyState
          title="No invoices yet"
          description="Recently created invoices will appear here."
        />
      )}
    </ComponentCard>
  );
}
