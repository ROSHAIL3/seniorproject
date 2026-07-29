"use client";

import Link from "next/link";
import { useState } from "react";
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
import { useReturnNavigation } from "@/hooks/useGoBack";
import OriginAwareLink from "@/components/common/OriginAwareLink";
import BrandLogo from "@/components/common/BrandLogo";

export default function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  const back = useReturnNavigation("/invoices", "Invoices");
  const [current, setCurrent] = useState(invoice);
  return (
    <div className="invoice-page space-y-6">
      <div className="invoice-screen-heading flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={back.destination}
            aria-label={`Back to ${back.label}`}
            className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 print:hidden"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Invoice Details
            </h1>
            <Link
              href={back.destination}
              className="mt-1 inline-block text-sm text-brand-500 hover:text-brand-600 print:hidden"
            >
              Back to {back.label}
            </Link>
          </div>
        </div>
        <InvoiceActions
          invoice={current}
          onUpdated={setCurrent}
        />
      </div>

      <article
        className="invoice-print-document space-y-6"
        aria-label={`Invoice ${current.invoiceNumber}`}
      >
        <div className="invoice-print-brand hidden items-start justify-between border-b border-gray-200 pb-4">
          <BrandLogo size="lg" className="text-gray-900" />
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Invoice
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {current.invoiceNumber}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Issued {formatDisplayDate(current.issuedOn)}
            </p>
          </div>
        </div>

        <ComponentCard
          title={current.invoiceNumber}
          action={<InvoiceStatusBadge status={current.status} />}
          className="invoice-print-section invoice-summary"
        >
          <div className="invoice-summary-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Information label="Customer" value={current.customerName} />
          <Information label="Phone" value={current.customerPhone} />
          <Information
            label="Email"
            value={
              <a
                href={`mailto:${current.customerEmail}`}
                className="break-all text-brand-500 hover:text-brand-600"
              >
                {current.customerEmail}
              </a>
            }
          />
          <Information
            label="Invoice date"
            value={formatDisplayDate(current.issuedOn)}
          />
          <Information label="Created by" value={current.createdBy} />
          <Information
            label="Payment status"
            value={<InvoiceStatusBadge status={current.status} />}
          />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Invoice Items"
          bodyClassName="p-0"
          className="invoice-print-section invoice-items-section"
        >
          <div className="invoice-print-table-wrap max-w-full overflow-x-auto">
            <Table className="invoice-print-table min-w-[720px]">
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
              {current.items.map((item) => {
                const appointment = current.appointments.find(
                  (record) => record.id === item.appointmentId,
                );
                return (
                  <TableRow key={item.id}>
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {item.description}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      {appointment && (
                        <OriginAwareLink
                          href={`/appointments/${appointment.bookingNumber}`}
                          className="font-medium text-brand-500 hover:text-brand-600"
                        >
                          {appointment.bookingNumber}
                        </OriginAwareLink>
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

          <div className="invoice-totals-wrap flex justify-end px-4 pb-5 sm:px-6">
            <dl className="invoice-print-totals w-full max-w-sm space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <TotalRow label="Subtotal" value={formatBhd(current.subtotalBhd)} />
            <TotalRow
              label={`VAT (${(current.vatRate * 100).toFixed(0)}%)`}
              value={formatBhd(current.vatBhd)}
            />
            <TotalRow
              label="Total amount"
              value={formatBhd(current.totalBhd)}
              strong
            />
            <TotalRow
              label="Amount paid"
              value={formatBhd(current.amountPaidBhd)}
              valueClassName="text-success-600 dark:text-success-500"
            />
            <TotalRow
              label="Remaining balance"
              value={formatBhd(current.remainingBalanceBhd)}
              strong
              valueClassName="text-brand-600 dark:text-brand-400"
            />
            </dl>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Linked Appointments"
          bodyClassName="p-0"
          className="invoice-print-section invoice-linked-section"
        >
          <div className="invoice-print-table-wrap max-w-full overflow-x-auto">
            <Table className="invoice-print-table min-w-[760px]">
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
              {current.appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="px-6 py-4 text-sm">
                    <OriginAwareLink
                      href={`/appointments/${appointment.bookingNumber}`}
                      className="font-medium text-brand-500 hover:text-brand-600"
                    >
                      {appointment.bookingNumber}
                    </OriginAwareLink>
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

        <ComponentCard
          title="Payment History"
          bodyClassName="p-0"
          className="invoice-print-section"
        >
          {current.payments.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">
              No payment transactions have been recorded.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table className="min-w-[680px]">
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <TableRow>
                    {["Date", "Type", "Method", "Recorded by", "Note", "Amount"].map(
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
                  {current.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(payment.recordedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {payment.kind}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {payment.method}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {payment.recordedBy}
                      </TableCell>
                      <TableCell className="max-w-48 truncate px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {payment.note || "—"}
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap px-6 py-4 text-sm font-semibold ${
                          payment.kind === "Refund"
                            ? "text-error-600"
                            : "text-success-600"
                        }`}
                      >
                        {payment.kind === "Refund" ? "−" : "+"}
                        {formatBhd(payment.amountBhd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ComponentCard>
      </article>
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
