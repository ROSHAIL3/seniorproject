"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import ThemedLineChart from "@/components/charts/line/ThemedLineChart";
import { DownloadIcon } from "@/icons";
import { dayNames, getDefaultReportFilters, getReportData, reportToCsv } from "@/services/reports.service";
import type { AnyReportEnvelope, BusyHoursReport, MoneyBreakdown, ProfitLossReport, ReportFilters, ReportKind, RevenueReport, ServiceProfitabilityRow, StaffPerformanceRow, TopCustomerRow, VatReturnReport } from "@/types/reports";

const details: Record<ReportKind, { title: string; description: string; file: string }> = {
  revenue: { title: "Revenue Report", description: "Paid revenue from completed appointments, with daily, service and staff breakdowns.", file: "revenue-report.csv" },
  "vat-return": { title: "VAT Return", description: "Output VAT collected compared with input VAT paid for the selected period.", file: "vat-return.csv" },
  "profit-loss": { title: "Profit & Loss", description: "Paid revenue minus business expenses, including profit margin and breakdowns.", file: "profit-loss.csv" },
  "top-customers": { title: "Top Customers", description: "Top 20 customers ranked by valid paid spend.", file: "top-customers.csv" },
  "staff-performance": { title: "Staff Performance", description: "Completed appointments, generated revenue, ticket value and attendance rates.", file: "staff-performance.csv" },
  "service-profitability": { title: "Service Profitability", description: "Completed bookings, paid revenue and revenue earned per service hour.", file: "service-profitability.csv" },
  "busy-hours": { title: "Busy Hours", description: "Appointment density by day and hour. Darker cells indicate busier times.", file: "busy-hours.csv" },
};

export default function ReportPageClient({ kind }: { kind: ReportKind }) {
  const [filters, setFilters] = useState<ReportFilters>(getDefaultReportFilters);
  const [report, setReport] = useState<AnyReportEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (next: ReportFilters) => {
    setLoading(true); setError("");
    try { setReport(await getReportData(kind, next)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The report could not be loaded."); }
    finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { const initial = getDefaultReportFilters(); queueMicrotask(() => { void load(initial); }); }, [load]);
  const set = (key: keyof ReportFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const exportCsv = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob(["\uFEFF", reportToCsv(report)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = details[kind].file; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">{details[kind].title}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{details[kind].description}</p></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] xl:flex-row xl:items-end">
      <DateField label="From date" value={filters.from} onChange={(value) => set("from", value)} />
      <DateField label="To date" value={filters.to} onChange={(value) => set("to", value)} />
      {report && report.branches.length > 1 && <FilterSelect label="Branch" value={filters.branchId} options={[{ value: "all", label: "All branches" }, ...report.branches.map((branch) => ({ value: branch.id, label: branch.name }))]} onChange={(value) => set("branchId", value)} />}
      {kind === "busy-hours" && report && <FilterSelect label="Staff" value={filters.staffId ?? "all"} options={[{ value: "all", label: "All staff" }, ...report.staffMembers.map((member) => ({ value: member.id, label: member.fullName }))]} onChange={(value) => set("staffId", value)} />}
      <Button size="sm" onClick={() => load(filters)} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
      <Button size="sm" variant="outline" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!report || loading} className="xl:ml-auto">Export CSV</Button>
    </div>
    {error ? <ErrorState message={error} onRetry={() => load(filters)} /> : loading && !report ? <LoadingState /> : report?.isEmpty ? <EmptyState /> : report ? <ReportContent report={report} /> : null}
  </div>;
}

function ReportContent({ report }: { report: AnyReportEnvelope }) {
  if (report.kind === "revenue") return <RevenueContent data={report.data} />;
  if (report.kind === "vat-return") return <VatContent data={report.data} filters={report.filters} />;
  if (report.kind === "profit-loss") return <ProfitLossContent data={report.data} />;
  if (report.kind === "top-customers") return <TopCustomersContent rows={report.data} />;
  if (report.kind === "staff-performance") return <StaffPerformanceContent rows={report.data} />;
  if (report.kind === "service-profitability") return <ServiceProfitabilityContent rows={report.data} />;
  return <BusyHoursContent data={report.data} />;
}

function RevenueContent({ data }: { data: RevenueReport }) { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2"><Metric label="Total revenue" value={bhd(data.totalRevenueBhd)} tone="success" /><Metric label="Completed appointments" value={String(data.completedAppointments)} /></div><section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Daily revenue</h2><RevenueChart rows={data.daily} /></section><div className="grid gap-6 xl:grid-cols-2"><Breakdown title="Revenue by service" rows={data.byService} /><Breakdown title="Revenue by staff" rows={data.byStaff} /></div></div>; }
function VatContent({ data, filters }: { data: VatReturnReport; filters: ReportFilters }) { const recoverable = data.netVatBhd < 0; return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><Metric label="Output VAT collected" value={bhd(data.outputVatBhd)} note={`From ${data.invoiceCount} paid invoice${data.invoiceCount === 1 ? "" : "s"}`} tone="success" /><Metric label="Input VAT paid" value={bhd(data.inputVatBhd)} note={`From ${data.expenseCount} expense${data.expenseCount === 1 ? "" : "s"}`} tone="error" /><Metric label={recoverable ? "VAT recoverable" : "Net VAT payable"} value={bhd(Math.abs(data.netVatBhd))} note={recoverable ? "Recoverable from the tax authority" : "Payable to the tax authority"} /></div><section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">VAT return summary</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><Summary label="Invoice subtotal" value={bhd(data.invoiceSubtotalBhd)} /><Summary label="Invoice total including VAT" value={bhd(data.invoiceTotalBhd)} /><Summary label="Total expenses" value={bhd(data.totalExpensesBhd)} /><Summary label="VAT rate" value={`${data.vatRatePercent.toFixed(3)}%`} /><Summary label="Period from" value={formatDate(filters.from)} /><Summary label="Period to" value={formatDate(filters.to)} /></dl></section></div>; }
function ProfitLossContent({ data }: { data: ProfitLossReport }) { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Revenue" value={bhd(data.revenueBhd)} tone="success" /><Metric label="Expenses" value={bhd(data.expensesBhd)} tone="error" /><Metric label={data.profitBhd >= 0 ? "Profit" : "Loss"} value={bhd(Math.abs(data.profitBhd))} tone={data.profitBhd >= 0 ? "success" : "error"} /><Metric label="Profit margin" value={`${data.marginPercent.toFixed(1)}%`} /></div><div className="grid gap-6 xl:grid-cols-2"><Breakdown title="Revenue breakdown" rows={data.revenueBreakdown} /><Breakdown title="Expense breakdown" rows={data.expenseBreakdown} /></div></div>; }
function TopCustomersContent({ rows }: { rows: TopCustomerRow[] }) { return <ReportTable headers={["Rank", "Customer", "Email", "Phone", "Completed visits", "Total spend"]}>{rows.map((row, index) => <tr key={row.customerId} className="border-t border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300 [&>td]:px-5 [&>td]:py-4"><td>{index + 1}</td><td><Link className="font-medium text-brand-600 hover:underline dark:text-brand-400" href={`/customers/${row.customerId}`}>{row.customer}</Link></td><td>{row.email}</td><td>{row.phone}</td><td>{row.completedVisits}</td><td>{bhd(row.totalSpendBhd)}</td></tr>)}</ReportTable>; }
function StaffPerformanceContent({ rows }: { rows: StaffPerformanceRow[] }) { return <ReportTable headers={["Rank", "Staff member", "Completed", "Revenue", "Average ticket", "Completion", "No-show"]}>{rows.map((row, index) => <tr key={row.staffId} className="border-t border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300 [&>td]:px-5 [&>td]:py-4"><td>{index + 1}</td><td><Link className="font-medium text-brand-600 hover:underline dark:text-brand-400" href={`/settings/team-members/${row.staffId}`}>{row.staff}</Link></td><td>{row.completedAppointments}</td><td>{bhd(row.revenueBhd)}</td><td>{bhd(row.averageTicketBhd)}</td><td>{row.completionRate.toFixed(1)}%</td><td>{row.noShowRate.toFixed(1)}%</td></tr>)}</ReportTable>; }
function ServiceProfitabilityContent({ rows }: { rows: ServiceProfitabilityRow[] }) { return <ReportTable headers={["Service", "Bookings", "Revenue", "Total service minutes", "Revenue / hour"]}>{rows.map((row) => <tr key={row.serviceId} className="border-t border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300 [&>td]:px-5 [&>td]:py-4"><td><Link className="font-medium text-brand-600 hover:underline dark:text-brand-400" href={`/settings/services/${row.serviceId}`}>{row.service}</Link></td><td>{row.bookings}</td><td>{bhd(row.revenueBhd)}</td><td>{row.totalMinutes}</td><td>{bhd(row.revenuePerHourBhd)}</td></tr>)}</ReportTable>; }

function BusyHoursContent({ data }: { data: BusyHoursReport }) { return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"><div className="overflow-x-auto"><div className="min-w-[1120px]"><div className="grid grid-cols-[74px_repeat(24,minmax(40px,1fr))] gap-1"><span />{Array.from({ length: 24 }, (_, hour) => <span key={hour} className="pb-2 text-center text-xs text-gray-500 dark:text-gray-400">{hourLabel(hour)}</span>)}{dayNames.map((day, dayIndex) => <BusyRow key={day} day={day} dayIndex={dayIndex} data={data} />)}</div></div></div><div className="mt-5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><span>Less busy</span>{heatmapLegendClasses.map((className) => <span key={className} className={`size-5 rounded ${className}`} />)}<span>More busy</span></div></section>; }
function BusyRow({ day, dayIndex, data }: { day: string; dayIndex: number; data: BusyHoursReport }) { return <><span className="flex h-10 items-center text-xs font-medium text-gray-600 dark:text-gray-300">{day.slice(0, 3)}</span>{Array.from({ length: 24 }, (_, hour) => { const count = data.cells.find((cell) => cell.dayOfWeek === dayIndex && cell.hour === hour)?.appointments ?? 0; return <div key={hour} title={`${day}, ${hourLabel(hour)}: ${count} appointment${count === 1 ? "" : "s"}`} className={`flex h-10 items-center justify-center rounded text-xs font-medium ${heatmapCellClass(count, data.maxAppointments)}`}>{count || ""}</div>; })}</>; }

function RevenueChart({ rows }: { rows: { date: string; amountBhd: number }[] }) { return <div className="mt-5"><ThemedLineChart categories={rows.map((row) => formatChartDate(row.date))} series={[{ name: "Daily revenue", data: rows.map((row) => row.amountBhd) }]} valueFormatter={(value) => `${value.toFixed(3)} BHD`} emptyMessage="No paid daily revenue for this period." /></div>; }
function Breakdown({ title, rows }: { title: string; rows: MoneyBreakdown[] }) { return <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h2><div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">{rows.length ? rows.map((row) => <div key={row.id} className="flex justify-between gap-4 py-3 text-sm"><span className="text-gray-600 dark:text-gray-300">{row.label}</span><span className="font-medium text-gray-800 dark:text-white/90">{bhd(row.amountBhd)}</span></div>) : <p className="py-6 text-sm text-gray-500">No paid revenue in this breakdown.</p>}</div></section>; }
function Metric({ label, value, note, tone = "default" }: { label: string; value: string; note?: string; tone?: "default" | "success" | "error" }) { return <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"><p className="text-sm text-gray-500">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone === "success" ? "text-success-600" : tone === "error" ? "text-error-600" : "text-gray-800 dark:text-white/90"}`}>{value}</p>{note && <p className="mt-2 text-xs text-gray-400">{note}</p>}</section>; }
function Summary({ label, value }: { label: string; value: string }) { return <div><dt className="text-sm text-gray-500">{label}</dt><dd className="mt-1 font-medium text-gray-800 dark:text-white/90">{value}</dd></div>; }
function ReportTable({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60"><tr>{headers.map((header) => <th key={header} className="px-5 py-4 font-medium">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>; }
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block w-full xl:w-48"><span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span><Input type="date" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) { return <div className="w-full xl:w-56"><span className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span><Select key={`${label}-${value}`} options={options} defaultValue={value} onChange={onChange} /></div>; }
function LoadingState() { return <div className="grid animate-pulse gap-5 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-gray-100 dark:bg-gray-800" />)}</div>; }
function EmptyState() { return <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 text-center dark:border-gray-700 dark:bg-white/[0.02]"><h2 className="font-medium text-gray-800 dark:text-white/90">No report data for this period</h2><p className="mt-2 text-sm text-gray-500">Change the date or branch filters, then refresh the report.</p></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="rounded-2xl border border-error-200 bg-error-50 p-8 text-center"><h2 className="font-semibold text-error-700">Report unavailable</h2><p className="mt-2 text-sm text-error-600">{message}</p><Button size="sm" className="mt-5" onClick={onRetry}>Try again</Button></div>; }
function bhd(value: number) { return `${value.toFixed(3)} BHD`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function formatChartDate(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`)); }
function hourLabel(hour: number) { if (hour === 0) return "12 AM"; if (hour === 12) return "12 PM"; return `${hour % 12} ${hour < 12 ? "AM" : "PM"}`; }
const heatmapLegendClasses = ["bg-brand-100", "bg-brand-300", "bg-brand-500", "bg-brand-700", "bg-brand-900"];
function heatmapCellClass(count: number, maximum: number) {
  if (!count) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  const level = Math.min(4, Math.ceil((count / Math.max(maximum, 1)) * 5) - 1);
  return [
    "bg-brand-100 text-brand-950",
    "bg-brand-300 text-brand-950",
    "bg-brand-500 text-white",
    "bg-brand-700 text-white",
    "bg-brand-900 text-white",
  ][level];
}
