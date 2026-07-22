import Link from "next/link";
import ComponentCard from "@/components/common/ComponentCard";
import AppointmentStatusBadge from "@/components/appointments/AppointmentStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeftIcon } from "@/icons";
import { formatBhd, formatDisplayDate } from "@/lib/formatters";
import type { Invoice } from "@/types/invoices";
import InvoiceActions from "./InvoiceActions";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

export default function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            aria-label="Back to Invoices"
            className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 print:hidden"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Invoice Details
            </h1>
            <Link
              href="/invoices"
              className="mt-1 inline-block text-sm text-brand-500 hover:text-brand-600 print:hidden"
            >
              Back to Invoices
            </Link>
          </div>
        </div>
        <InvoiceActions
          customerEmail={invoice.customerEmail}
          invoiceNumber={invoice.invoiceNumber}
        />
      </div>

      <ComponentCard
        title={invoice.invoiceNumber}
        action={<InvoiceStatusBadge status={invoice.status} />}
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Information label="Customer" value={invoice.customerName} />
          <Information label="Phone" value={invoice.customerPhone} />
          <Information
            label="Email"
            value={
              <a
                href={`mailto:${invoice.customerEmail}`}
                className="break-all text-brand-500 hover:text-brand-600"
              >
                {invoice.customerEmail}
              </a>
            }
          />
          <Information
            label="Invoice date"
            value={formatDisplayDate(invoice.issuedOn)}
          />
          <Information label="Created by" value={invoice.createdBy} />
          <Information
            label="Payment status"
            value={<InvoiceStatusBadge status={invoice.status} />}
          />
        </div>
      </ComponentCard>

      <ComponentCard title="Invoice Items" bodyClassName="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {[
                  "Description",
                  "Linked Appointment",
                  "Quantity",
                  "Unit Price",
                  "Total",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    isHeader
                    className="px-6 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoice.items.map((item) => {
                const appointment = invoice.appointments.find(
                  (record) => record.id === item.appointmentId,
                );
                return (
                  <TableRow key={item.id}>
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {item.description}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      {appointment && (
                        <Link
                          href={`/appointments/${appointment.bookingNumber}`}
                          className="font-medium text-brand-500 hover:text-brand-600"
                        >
                          {appointment.bookingNumber}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatBhd(item.unitPriceBhd)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {formatBhd(item.totalBhd)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end px-4 pb-5 sm:px-6">
          <dl className="w-full max-w-sm space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <TotalRow label="Subtotal" value={formatBhd(invoice.subtotalBhd)} />
            <TotalRow
              label={`VAT (${(invoice.vatRate * 100).toFixed(0)}%)`}
              value={formatBhd(invoice.vatBhd)}
            />
            <TotalRow
              label="Total amount"
              value={formatBhd(invoice.totalBhd)}
              strong
            />
            <TotalRow
              label="Amount paid"
              value={formatBhd(invoice.amountPaidBhd)}
              valueClassName="text-success-600 dark:text-success-500"
            />
            <TotalRow
              label="Remaining balance"
              value={formatBhd(invoice.remainingBalanceBhd)}
              strong
              valueClassName="text-brand-600 dark:text-brand-400"
            />
          </dl>
        </div>
      </ComponentCard>

      <ComponentCard title="Linked Appointments" bodyClassName="p-0">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {[
                  "Booking Number",
                  "Date",
                  "Time",
                  "Service",
                  "Staff",
                  "Status",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    isHeader
                    className="px-6 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoice.appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="px-6 py-4 text-sm">
                    <Link
                      href={`/appointments/${appointment.bookingNumber}`}
                      className="font-medium text-brand-500 hover:text-brand-600"
                    >
                      {appointment.bookingNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDisplayDate(appointment.appointmentDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {appointment.startTime}–{appointment.endTime}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {appointment.serviceName}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {appointment.staffName}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <AppointmentStatusBadge status={appointment.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>
    </div>
  );
}

function Information({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  valueClassName = "",
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 text-sm ${
        strong ? "border-t border-gray-100 pt-3 dark:border-gray-800" : ""
      }`}
    >
      <dt className={strong ? "font-medium text-gray-800 dark:text-white/90" : "text-gray-500 dark:text-gray-400"}>
        {label}
      </dt>
      <dd className={`font-semibold text-gray-800 dark:text-white/90 ${valueClassName}`}>
        {value}
      </dd>
    </div>
  );
}
