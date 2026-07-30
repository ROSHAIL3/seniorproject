import type { Metadata } from "next";
import Link from "next/link";
import ExpensesThisMonth from "@/components/dashboard/ExpensesThisMonth";
import NextUpToday from "@/components/dashboard/NextUpToday";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TopServices from "@/components/dashboard/TopServices";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import { getDashboardData } from "@/services/dashboard.service";
import { getPendingBookingCountsFromDatabase } from "@/server/public-booking.repository";
import { getNotificationsFromDatabase } from "@/server/notifications.repository";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Appointments and business overview dashboard",
};

export default async function Dashboard() {
  const [dashboard, pending, notifications] = await Promise.all([
    getDashboardData(),
    getPendingBookingCountsFromDatabase(),
    getNotificationsFromDatabase(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>
      {(pending.publicBookings > 0 || pending.reschedules > 0) && (
        <Link href="/appointments" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{pending.publicBookings + pending.reschedules}</strong> booking operation{pending.publicBookings + pending.reschedules === 1 ? "" : "s"} need review.
        </Link>
      )}
      {notifications.unreadCount > 0 && (
        <Link href="/notifications" className="block rounded-2xl border border-blue-light-200 bg-blue-light-50 p-4 text-sm text-blue-light-800 dark:border-blue-light-500/20 dark:bg-blue-light-500/10 dark:text-blue-light-400">
          <strong>{notifications.unreadCount}</strong> unread operational notification{notifications.unreadCount === 1 ? "" : "s"}.
        </Link>
      )}

      <SummaryCards
        todayCount={dashboard.todayCount}
        weekCount={dashboard.weekCount}
        teamMemberCount={dashboard.teamMemberCount}
        activeTeamMemberCount={dashboard.activeTeamMemberCount}
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-7">
          <NextUpToday appointment={dashboard.nextAppointment} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <TopServices services={dashboard.topServices} />
        </div>

        <div className="col-span-12">
          <UpcomingAppointments appointments={dashboard.upcomingAppointments} />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentInvoices invoices={dashboard.recentInvoices} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <ExpensesThisMonth
            total={dashboard.expenseTotalBhd}
            categories={dashboard.expenseCategories}
          />
        </div>
      </div>
    </div>
  );
}
