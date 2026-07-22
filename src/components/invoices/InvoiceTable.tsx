"use client";

import Link from "next/link";
import AvatarText from "@/components/ui/avatar/AvatarText";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EyeIcon } from "@/icons";
import { formatBhd, formatDisplayDate } from "@/lib/formatters";
import type { Invoice } from "@/types/invoices";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

type InvoiceTableProps = {
  invoices: Invoice[];
  isLoading?: boolean;
};

const headings = [
  "Invoice Number",
  "Customer",
  "Total",
  "Amount Paid",
  "Remaining Balance",
  "Created By",
  "Payment Status",
  "Invoice Date",
  "Actions",
];

export default function InvoiceTable({
  invoices,
  isLoading = false,
}: InvoiceTableProps) {
  if (isLoading) return <InvoiceTableLoading />;

  if (invoices.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <span className="text-lg">#</span>
        </div>
        <h3 className="font-medium text-gray-800 dark:text-white/90">
          No invoices found
        </h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Try adjusting the search, payment status, or invoice date range.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden max-w-full overflow-x-auto md:block">
        <Table className="min-w-[1420px]">
          <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableRow>
              {headings.map((heading) => (
                <TableCell
                  key={heading}
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="whitespace-nowrap px-5 py-4 text-sm font-medium text-brand-500 dark:text-brand-400">
                  <Link href={`/invoices/${invoice.invoiceNumber}`}>
                    {invoice.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <AvatarText
                      name={invoice.customerName}
                      className="h-8 w-8 shrink-0 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="whitespace-nowrap text-sm font-medium text-gray-800 dark:text-white/90">
                        {invoice.customerName}
                      </p>
                      <p className="whitespace-nowrap text-xs text-gray-400">
                        {invoice.customerPhone}
                      </p>
                    </div>
                  </div>
                </TableCell>
                {[invoice.totalBhd, invoice.amountPaidBhd, invoice.remainingBalanceBhd].map(
                  (amount, index) => (
                    <TableCell
                      key={`${invoice.id}-${index}`}
                      className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      {formatBhd(amount)}
                    </TableCell>
                  ),
                )}
                <TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {invoice.createdBy}
                </TableCell>
                <TableCell className="whitespace-nowrap px-5 py-4">
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatDisplayDate(invoice.issuedOn)}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <Link
                    href={`/invoices/${invoice.invoiceNumber}`}
                    aria-label={`View ${invoice.invoiceNumber}`}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <EyeIcon className="size-5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
        {invoices.map((invoice) => (
          <Link
            key={invoice.id}
            href={`/invoices/${invoice.invoiceNumber}`}
            className="block p-4 transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-brand-500">{invoice.invoiceNumber}</p>
                <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                  {invoice.customerName}
                </p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <MobileValue label="Total" value={formatBhd(invoice.totalBhd)} />
              <MobileValue label="Paid" value={formatBhd(invoice.amountPaidBhd)} />
              <MobileValue label="Balance" value={formatBhd(invoice.remainingBalanceBhd)} />
              <MobileValue label="Date" value={formatDisplayDate(invoice.issuedOn)} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function MobileValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-gray-600 dark:text-gray-300">{value}</p>
    </div>
  );
}

function InvoiceTableLoading() {
  return (
    <div className="space-y-3 p-5" aria-label="Loading invoices">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
        />
      ))}
    </div>
  );
}
