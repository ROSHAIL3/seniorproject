"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/tables/Pagination";
import type { Invoice } from "@/types/invoices";
import InvoiceFilters, { type InvoiceStatusFilter } from "./InvoiceFilters";
import InvoiceTable from "./InvoiceTable";

const PAGE_SIZE = 5;

export default function InvoicesListClient({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatusFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    },
    [],
  );

  const showLoading = () => {
    setIsLoading(true);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setIsLoading(false), 200);
  };

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          invoice.invoiceNumber,
          invoice.customerName,
          invoice.customerPhone,
          invoice.customerEmail,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesStatus = status === "all" || invoice.status === status;
      const matchesFrom = !fromDate || invoice.issuedOn >= fromDate;
      const matchesTo = !toDate || invoice.issuedOn <= toDate;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [fromDate, invoices, search, status, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleInvoices = filteredInvoices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const updateFilter = (operation: () => void) => {
    operation();
    setPage(1);
    showLoading();
  };

  const exportCsv = () => {
    const headings = [
      "Invoice Number",
      "Customer",
      "Phone",
      "Email",
      "Total BHD",
      "Amount Paid BHD",
      "Remaining Balance BHD",
      "Created By",
      "Payment Status",
      "Invoice Date",
    ];
    const rows = filteredInvoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.customerName,
      invoice.customerPhone,
      invoice.customerEmail,
      invoice.totalBhd.toFixed(3),
      invoice.amountPaidBhd.toFixed(3),
      invoice.remainingBalanceBhd.toFixed(3),
      invoice.createdBy,
      invoice.status,
      invoice.issuedOn,
    ]);
    const csv = [headings, ...rows]
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review invoices generated from appointments and service totals.
        </p>
      </div>

      <InvoiceFilters
        search={search}
        status={status}
        fromDate={fromDate}
        toDate={toDate}
        onSearchChange={(value) => updateFilter(() => setSearch(value))}
        onStatusChange={(value) => updateFilter(() => setStatus(value))}
        onFromDateChange={(value) =>
          updateFilter(() => {
            setFromDate(value);
            if (value && toDate && value > toDate) setToDate(value);
          })
        }
        onToDateChange={(value) =>
          updateFilter(() => {
            setToDate(value);
            if (value && fromDate && value < fromDate) setFromDate(value);
          })
        }
        onExport={exportCsv}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <InvoiceTable invoices={visibleInvoices} isLoading={isLoading} />
        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredInvoices.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of{" "}
            {filteredInvoices.length}
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
