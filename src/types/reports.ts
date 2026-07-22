import type { Branch } from "./branches";
import type { TeamMember } from "./team-members";

export type ReportKind =
  | "revenue"
  | "vat-return"
  | "profit-loss"
  | "top-customers"
  | "staff-performance"
  | "service-profitability"
  | "busy-hours";

export type ReportFilters = {
  from: string;
  to: string;
  branchId: string;
  staffId?: string;
};

export type MoneyBreakdown = { id: string; label: string; amountBhd: number };
export type ReportEnvelope<T> = {
  kind: ReportKind;
  filters: ReportFilters;
  branches: Branch[];
  staffMembers: TeamMember[];
  generatedAt: string;
  isEmpty: boolean;
  data: T;
};

export type RevenueReport = {
  totalRevenueBhd: number;
  completedAppointments: number;
  daily: { date: string; amountBhd: number }[];
  byService: MoneyBreakdown[];
  byStaff: MoneyBreakdown[];
};

export type VatReturnReport = {
  outputVatBhd: number;
  inputVatBhd: number;
  netVatBhd: number;
  invoiceSubtotalBhd: number;
  invoiceTotalBhd: number;
  totalExpensesBhd: number;
  invoiceCount: number;
  expenseCount: number;
  vatRatePercent: number;
};

export type ProfitLossReport = {
  revenueBhd: number;
  expensesBhd: number;
  profitBhd: number;
  marginPercent: number;
  revenueBreakdown: MoneyBreakdown[];
  expenseBreakdown: MoneyBreakdown[];
};

export type TopCustomerRow = {
  customerId: string;
  customer: string;
  email: string;
  phone: string;
  completedVisits: number;
  totalSpendBhd: number;
};

export type StaffPerformanceRow = {
  staffId: string;
  staff: string;
  completedAppointments: number;
  revenueBhd: number;
  averageTicketBhd: number;
  completionRate: number;
  noShowRate: number;
};

export type ServiceProfitabilityRow = {
  serviceId: string;
  service: string;
  bookings: number;
  revenueBhd: number;
  totalMinutes: number;
  revenuePerHourBhd: number;
};

export type BusyHoursReport = {
  cells: { dayOfWeek: number; hour: number; appointments: number }[];
  maxAppointments: number;
  totalAppointments: number;
};

export type ReportDataMap = {
  revenue: RevenueReport;
  "vat-return": VatReturnReport;
  "profit-loss": ProfitLossReport;
  "top-customers": TopCustomerRow[];
  "staff-performance": StaffPerformanceRow[];
  "service-profitability": ServiceProfitabilityRow[];
  "busy-hours": BusyHoursReport;
};

export type AnyReportEnvelope = {
  [K in ReportKind]: ReportEnvelope<ReportDataMap[K]> & { kind: K };
}[ReportKind];
