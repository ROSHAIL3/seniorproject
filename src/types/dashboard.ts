import type { AppointmentStatus } from "./appointments";
import type { InvoiceStatus } from "./invoices";

export type DashboardAppointment = {
  id: string;
  bookingNumber: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  status: AppointmentStatus;
};

export type ServiceMetric = {
  id: string;
  name: string;
  bookings: number;
  percentage: number;
};

export type DashboardInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalBhd: number;
  status: InvoiceStatus;
};

export type ExpenseCategorySummary = {
  id: string;
  name: string;
  amountBhd: number;
  percentage: number;
  colorClass: string;
};

export type DashboardData = {
  todayCount: number;
  weekCount: number;
  teamMemberCount: number;
  activeTeamMemberCount: number;
  nextAppointment: DashboardAppointment | null;
  upcomingAppointments: DashboardAppointment[];
  topServices: ServiceMetric[];
  recentInvoices: DashboardInvoice[];
  expenseTotalBhd: number;
  expenseCategories: ExpenseCategorySummary[];
};
