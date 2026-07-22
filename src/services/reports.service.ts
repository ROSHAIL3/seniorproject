import { getAppointments } from "./appointments.service";
import { getAppointmentSettings } from "./appointment-settings.service";
import { getBranches } from "./branches.service";
import { getCustomers } from "./customers.service";
import { getExpenseCategories, getExpenses } from "./expenses.service";
import { getInvoices } from "./invoices.service";
import { getServices } from "./services.service";
import { getTeamMembers } from "./team-members.service";
import type { Appointment } from "@/types/appointments";
import type { Invoice } from "@/types/invoices";
import type {
  AnyReportEnvelope,
  BusyHoursReport,
  MoneyBreakdown,
  ProfitLossReport,
  ReportFilters,
  ReportKind,
  RevenueReport,
  ServiceProfitabilityRow,
  StaffPerformanceRow,
  TopCustomerRow,
  VatReturnReport,
} from "@/types/reports";

type Sources = Awaited<ReturnType<typeof loadSources>>;
type RevenueEntry = {
  invoiceId: string;
  date: string;
  appointment: Appointment;
  amountBhd: number;
};

export function getDefaultReportFilters(): ReportFilters {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    from: localDate(new Date(year, month, 1)),
    to: localDate(new Date(year, month + 1, 0)),
    branchId: "all",
    staffId: "all",
  };
}

export async function getReportData(kind: ReportKind, input: ReportFilters): Promise<AnyReportEnvelope> {
  const filters = normalizeFilters(input);
  const sources = await loadSources();
  const shared = {
    kind,
    filters,
    branches: sources.branches,
    staffMembers: sources.teamMembers,
    generatedAt: new Date().toISOString(),
  };

  if (kind === "revenue") {
    const data = buildRevenue(sources, filters);
    return { ...shared, kind, data, isEmpty: data.completedAppointments === 0 && data.totalRevenueBhd === 0 };
  }
  if (kind === "vat-return") {
    const data = buildVatReturn(sources, filters);
    return { ...shared, kind, data, isEmpty: data.invoiceCount === 0 && data.expenseCount === 0 };
  }
  if (kind === "profit-loss") {
    const data = buildProfitLoss(sources, filters);
    return { ...shared, kind, data, isEmpty: data.revenueBhd === 0 && data.expensesBhd === 0 };
  }
  if (kind === "top-customers") {
    const data = buildTopCustomers(sources, filters);
    return { ...shared, kind, data, isEmpty: data.length === 0 };
  }
  if (kind === "staff-performance") {
    const data = buildStaffPerformance(sources, filters);
    return { ...shared, kind, data, isEmpty: data.length === 0 };
  }
  if (kind === "service-profitability") {
    const data = buildServiceProfitability(sources, filters);
    return { ...shared, kind, data, isEmpty: data.length === 0 };
  }
  const data = buildBusyHours(sources, filters);
  return { ...shared, kind, data, isEmpty: data.totalAppointments === 0 };
}

async function loadSources() {
  const [appointments, invoices, expenses, expenseCategories, customers, teamMembers, services, branches, settings] = await Promise.all([
    getAppointments(), getInvoices(), getExpenses(), getExpenseCategories(), getCustomers(), getTeamMembers(), getServices(), getBranches(), getAppointmentSettings(),
  ]);
  return { appointments, invoices, expenses, expenseCategories, customers, teamMembers, services, branches, settings };
}

function normalizeFilters(filters: ReportFilters): ReportFilters {
  const defaults = getDefaultReportFilters();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : defaults.from;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : defaults.to;
  return { ...filters, from: from <= to ? from : to, to: from <= to ? to : from, branchId: filters.branchId || "all", staffId: filters.staffId || "all" };
}

function inPeriod(date: string, filters: ReportFilters) { return date >= filters.from && date <= filters.to; }
function inBranch(appointment: Appointment, filters: ReportFilters) { return filters.branchId === "all" || appointment.branchId === filters.branchId; }
function inStaff(appointment: Appointment, filters: ReportFilters) { return !filters.staffId || filters.staffId === "all" || appointment.staffId === filters.staffId; }

function paidRevenueEntries(sources: Sources, filters: ReportFilters): RevenueEntry[] {
  return sources.invoices
    .filter((invoice) => invoice.status === "Paid" && inPeriod(invoice.issuedOn, filters))
    .flatMap((invoice) => invoice.items.flatMap((item) => {
      const appointment = invoice.appointments.find((entry) => entry.id === item.appointmentId);
      if (!appointment || appointment.status !== "Completed" || !inBranch(appointment, filters) || !inStaff(appointment, filters)) return [];
      return [{ invoiceId: invoice.id, date: invoice.issuedOn, appointment, amountBhd: item.totalBhd }];
    }));
}

function buildRevenue(sources: Sources, filters: ReportFilters): RevenueReport {
  const entries = paidRevenueEntries(sources, filters);
  const completed = sources.appointments.filter((appointment) => appointment.status === "Completed" && inPeriod(appointment.appointmentDate, filters) && inBranch(appointment, filters) && inStaff(appointment, filters));
  const dailyRevenue = groupMoney(entries, (entry) => entry.date)
    .map((row) => ({ date: row.id, amountBhd: row.amountBhd }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    totalRevenueBhd: sum(entries.map((entry) => entry.amountBhd)),
    completedAppointments: completed.length,
    daily: dailyRevenue,
    byService: groupMoney(entries, (entry) => entry.appointment.serviceId, (entry) => entry.appointment.serviceName),
    byStaff: groupMoney(entries, (entry) => entry.appointment.staffId, (entry) => entry.appointment.staffName),
  };
}

function validPaidInvoices(sources: Sources, filters: ReportFilters): Invoice[] {
  return sources.invoices.filter((invoice) => invoice.status === "Paid" && inPeriod(invoice.issuedOn, filters) && invoice.appointments.some((appointment) => appointment.status !== "Cancelled" && inBranch(appointment, filters)));
}

function buildVatReturn(sources: Sources, filters: ReportFilters): VatReturnReport {
  const invoices = validPaidInvoices(sources, filters);
  const expenses = sources.expenses.filter((expense) => inPeriod(expense.incurredOn, filters) && (filters.branchId === "all" || expense.branchId === filters.branchId));
  const outputVatBhd = sum(invoices.map((invoice) => invoice.vatBhd));
  const inputVatBhd = sum(expenses.map((expense) => expense.inputVatBhd));
  return {
    outputVatBhd, inputVatBhd, netVatBhd: outputVatBhd - inputVatBhd,
    invoiceSubtotalBhd: sum(invoices.map((invoice) => invoice.subtotalBhd)),
    invoiceTotalBhd: sum(invoices.map((invoice) => invoice.totalBhd)),
    totalExpensesBhd: sum(expenses.map((expense) => expense.amountBhd)),
    invoiceCount: invoices.length, expenseCount: expenses.length,
    vatRatePercent: sources.settings.tax.enabled ? sources.settings.tax.ratePercent : 0,
  };
}

function buildProfitLoss(sources: Sources, filters: ReportFilters): ProfitLossReport {
  const revenueEntries = paidRevenueEntries(sources, filters);
  const expenses = sources.expenses.filter((expense) => inPeriod(expense.incurredOn, filters) && (filters.branchId === "all" || expense.branchId === filters.branchId));
  const revenueBhd = sum(revenueEntries.map((entry) => entry.amountBhd));
  const expensesBhd = sum(expenses.map((expense) => expense.amountBhd));
  const profitBhd = revenueBhd - expensesBhd;
  return {
    revenueBhd, expensesBhd, profitBhd,
    marginPercent: revenueBhd === 0 ? 0 : (profitBhd / revenueBhd) * 100,
    revenueBreakdown: groupMoney(revenueEntries, (entry) => entry.appointment.serviceId, (entry) => entry.appointment.serviceName),
    expenseBreakdown: groupMoney(expenses, (expense) => expense.categoryId, (expense) => sources.expenseCategories.find((category) => category.id === expense.categoryId)?.name ?? "Uncategorized", (expense) => expense.amountBhd),
  };
}

function buildTopCustomers(sources: Sources, filters: ReportFilters): TopCustomerRow[] {
  const entries = paidRevenueEntries(sources, filters);
  return sources.customers.map((customer) => {
    const customerEntries = entries.filter((entry) => entry.appointment.customerId === customer.id);
    const visits = sources.appointments.filter((appointment) => appointment.customerId === customer.id && appointment.status === "Completed" && inPeriod(appointment.appointmentDate, filters) && inBranch(appointment, filters)).length;
    return { customerId: customer.id, customer: customer.name, email: customer.email, phone: customer.phone, completedVisits: visits, totalSpendBhd: sum(customerEntries.map((entry) => entry.amountBhd)) };
  }).filter((row) => row.completedVisits > 0 || row.totalSpendBhd > 0).sort((a, b) => b.totalSpendBhd - a.totalSpendBhd || b.completedVisits - a.completedVisits).slice(0, 20);
}

function buildStaffPerformance(sources: Sources, filters: ReportFilters): StaffPerformanceRow[] {
  const periodAppointments = sources.appointments.filter((appointment) => inPeriod(appointment.appointmentDate, filters) && inBranch(appointment, filters));
  const entries = paidRevenueEntries(sources, filters);
  return sources.teamMembers.map((member) => {
    const appointments = periodAppointments.filter((appointment) => appointment.staffId === member.id);
    const completedAppointments = appointments.filter((appointment) => appointment.status === "Completed").length;
    const noShows = appointments.filter((appointment) => appointment.status === "No Show").length;
    const measurable = appointments.filter((appointment) => appointment.status !== "Cancelled").length;
    const revenueBhd = sum(entries.filter((entry) => entry.appointment.staffId === member.id).map((entry) => entry.amountBhd));
    return { staffId: member.id, staff: member.fullName, completedAppointments, revenueBhd, averageTicketBhd: completedAppointments ? revenueBhd / completedAppointments : 0, completionRate: measurable ? completedAppointments / measurable * 100 : 0, noShowRate: measurable ? noShows / measurable * 100 : 0 };
  }).filter((row) => row.completedAppointments > 0 || row.revenueBhd > 0).sort((a, b) => b.revenueBhd - a.revenueBhd || b.completedAppointments - a.completedAppointments);
}

function buildServiceProfitability(sources: Sources, filters: ReportFilters): ServiceProfitabilityRow[] {
  const entries = paidRevenueEntries(sources, filters);
  const completed = sources.appointments.filter((appointment) => appointment.status === "Completed" && inPeriod(appointment.appointmentDate, filters) && inBranch(appointment, filters) && inStaff(appointment, filters));
  return sources.services.map((service) => {
    const appointments = completed.filter((appointment) => appointment.serviceId === service.id);
    const revenueBhd = sum(entries.filter((entry) => entry.appointment.serviceId === service.id).map((entry) => entry.amountBhd));
    const totalMinutes = appointments.length * service.durationMinutes;
    return { serviceId: service.id, service: service.name, bookings: appointments.length, revenueBhd, totalMinutes, revenuePerHourBhd: totalMinutes ? revenueBhd / (totalMinutes / 60) : 0 };
  }).filter((row) => row.bookings > 0 || row.revenueBhd > 0).sort((a, b) => b.revenuePerHourBhd - a.revenuePerHourBhd || b.revenueBhd - a.revenueBhd);
}

function buildBusyHours(sources: Sources, filters: ReportFilters): BusyHoursReport {
  const appointments = sources.appointments.filter((appointment) => ["Booked", "Confirmed", "Completed"].includes(appointment.status) && inPeriod(appointment.appointmentDate, filters) && inBranch(appointment, filters) && inStaff(appointment, filters));
  const counts = new Map<string, number>();
  appointments.forEach((appointment) => {
    const day = new Date(`${appointment.appointmentDate}T00:00:00`).getDay();
    const hour = Number(appointment.startTime.slice(0, 2));
    counts.set(`${day}-${hour}`, (counts.get(`${day}-${hour}`) ?? 0) + 1);
  });
  const cells = Array.from({ length: 7 * 24 }, (_, index) => { const dayOfWeek = Math.floor(index / 24); const hour = index % 24; return { dayOfWeek, hour, appointments: counts.get(`${dayOfWeek}-${hour}`) ?? 0 }; });
  return { cells, maxAppointments: Math.max(0, ...cells.map((cell) => cell.appointments)), totalAppointments: appointments.length };
}

function groupMoney<T>(items: T[], id: (item: T) => string, label: (item: T) => string = id, amount: (item: T) => number = (item) => (item as T & { amountBhd: number }).amountBhd): MoneyBreakdown[] {
  const grouped = new Map<string, MoneyBreakdown>();
  items.forEach((item) => { const key = id(item); const current = grouped.get(key); grouped.set(key, { id: key, label: label(item), amountBhd: (current?.amountBhd ?? 0) + amount(item) }); });
  return [...grouped.values()].sort((a, b) => b.amountBhd - a.amountBhd);
}

function sum(values: number[]) { return values.reduce((total, value) => total + value, 0); }
function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export function reportToCsv(report: AnyReportEnvelope): string {
  const rows: Array<Array<string | number>> = [["Report", report.kind], ["From", report.filters.from], ["To", report.filters.to], []];
  if (report.kind === "revenue") rows.push(["Date", "Revenue BHD"], ...report.data.daily.map((row) => [row.date, money(row.amountBhd)]));
  if (report.kind === "vat-return") rows.push(["Metric", "BHD"], ["Output VAT", money(report.data.outputVatBhd)], ["Input VAT", money(report.data.inputVatBhd)], [report.data.netVatBhd >= 0 ? "Net VAT payable" : "VAT recoverable", money(Math.abs(report.data.netVatBhd))], ["Invoice subtotal", money(report.data.invoiceSubtotalBhd)], ["Invoice total", money(report.data.invoiceTotalBhd)], ["Total expenses", money(report.data.totalExpensesBhd)]);
  if (report.kind === "profit-loss") rows.push(["Metric", "Value"], ["Revenue", money(report.data.revenueBhd)], ["Expenses", money(report.data.expensesBhd)], ["Profit / loss", money(report.data.profitBhd)], ["Margin", `${report.data.marginPercent.toFixed(1)}%`]);
  if (report.kind === "top-customers") rows.push(["Rank", "Customer", "Email", "Phone", "Completed visits", "Total spend BHD"], ...report.data.map((row, index) => [index + 1, row.customer, row.email, row.phone, row.completedVisits, money(row.totalSpendBhd)]));
  if (report.kind === "staff-performance") rows.push(["Rank", "Staff", "Completed appointments", "Revenue BHD", "Average ticket BHD", "Completion rate", "No-show rate"], ...report.data.map((row, index) => [index + 1, row.staff, row.completedAppointments, money(row.revenueBhd), money(row.averageTicketBhd), `${row.completionRate.toFixed(1)}%`, `${row.noShowRate.toFixed(1)}%`]));
  if (report.kind === "service-profitability") rows.push(["Service", "Bookings", "Revenue BHD", "Total minutes", "Revenue per hour BHD"], ...report.data.map((row) => [row.service, row.bookings, money(row.revenueBhd), row.totalMinutes, money(row.revenuePerHourBhd)]));
  if (report.kind === "busy-hours") rows.push(["Day", "Hour", "Appointments"], ...report.data.cells.filter((cell) => cell.appointments).map((cell) => [dayNames[cell.dayOfWeek], `${String(cell.hour).padStart(2, "0")}:00`, cell.appointments]));
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string | number) { const text = String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function money(value: number) { return value.toFixed(3); }
export const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
