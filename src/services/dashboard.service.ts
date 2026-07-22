import { REFERENCE_TODAY } from "@/config/business";
import { getAppointments } from "./appointments.service";
import { getExpenseCategories, getExpenses } from "./expenses.service";
import { getInvoices } from "./invoices.service";
import { getServices } from "./services.service";
import { getStaffMembers } from "./staff.service";
import type { DashboardAppointment, DashboardData } from "@/types/dashboard";

const toDashboardAppointment = (appointment: Awaited<ReturnType<typeof getAppointments>>[number]): DashboardAppointment => ({
  id: appointment.id,
  bookingNumber: appointment.bookingNumber,
  appointmentDate: appointment.appointmentDate,
  startTime: appointment.startTime,
  endTime: appointment.endTime,
  customerName: appointment.customerName,
  serviceName: appointment.serviceName,
  staffName: appointment.staffName,
  status: appointment.status,
});

export async function getDashboardData(): Promise<DashboardData> {
  const [appointments, services, staff, invoices, expenses, categories] =
    await Promise.all([
      getAppointments(),
      getServices(),
      getStaffMembers(),
      getInvoices(),
      getExpenses(),
      getExpenseCategories(),
    ]);
  const weekEnd = "2026-07-25";
  const activeAppointments = appointments.filter(
    (appointment) => appointment.status !== "Cancelled",
  );
  const upcoming = activeAppointments
    .filter(
      (appointment) =>
        appointment.appointmentDate >= REFERENCE_TODAY &&
        appointment.appointmentDate <= weekEnd,
    )
    .sort((a, b) =>
      `${a.appointmentDate}T${a.startTime}`.localeCompare(
        `${b.appointmentDate}T${b.startTime}`,
      ),
    );
  const bookingCounts = services.map((service) => ({
    id: service.id,
    name: service.name,
    bookings: activeAppointments.filter(
      (appointment) => appointment.serviceId === service.id,
    ).length,
  }));
  const maxBookings = Math.max(...bookingCounts.map((item) => item.bookings), 1);
  const expenseTotalBhd = expenses.reduce(
    (total, expense) => total + expense.amountBhd,
    0,
  );

  return {
    todayCount: activeAppointments.filter(
      (appointment) => appointment.appointmentDate === REFERENCE_TODAY,
    ).length,
    weekCount: upcoming.length,
    teamMemberCount: staff.length,
    activeTeamMemberCount: staff.filter((member) => member.isActive).length,
    nextAppointment: upcoming[0] ? toDashboardAppointment(upcoming[0]) : null,
    upcomingAppointments: upcoming.slice(0, 5).map(toDashboardAppointment),
    topServices: bookingCounts
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 4)
      .map((item) => ({
        ...item,
        percentage: Math.round((item.bookings / maxBookings) * 100),
      })),
    recentInvoices: invoices.slice(0, 4).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      totalBhd: invoice.totalBhd,
      status: invoice.status,
    })),
    expenseTotalBhd,
    expenseCategories: categories.map((category) => {
      const amountBhd = expenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((total, expense) => total + expense.amountBhd, 0);
      return {
        id: category.id,
        name: category.name,
        amountBhd,
        percentage:
          expenseTotalBhd === 0
            ? 0
            : Math.round((amountBhd / expenseTotalBhd) * 100),
        colorClass: category.colorClass,
      };
    }),
  };
}
