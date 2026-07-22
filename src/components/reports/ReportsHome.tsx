import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { DollarLineIcon, GroupIcon, ListIcon, PieChartIcon, TimeIcon, UserCircleIcon } from "@/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
const groups: { title: string; reports: { title: string; description: string; href: string; icon: Icon }[] }[] = [
  { title: "Financial", reports: [
    { title: "Revenue", description: "Daily paid revenue trends and breakdowns by service and staff", href: "/reports/revenue", icon: PieChartIcon },
    { title: "VAT Return", description: "Output VAT collected, input VAT paid and net VAT", href: "/reports/vat-return", icon: ListIcon },
    { title: "Profit & Loss", description: "Revenue minus expenses with profit margin", href: "/reports/profit-loss", icon: DollarLineIcon },
  ] },
  { title: "Performance", reports: [
    { title: "Top Customers", description: "Top 20 customers ranked by valid paid spend", href: "/reports/top-customers", icon: GroupIcon },
    { title: "Staff Performance", description: "Completed appointments and revenue by team member", href: "/reports/staff-performance", icon: UserCircleIcon },
    { title: "Service Profitability", description: "Bookings, revenue, service minutes and revenue per hour", href: "/reports/service-profitability", icon: ListIcon },
  ] },
  { title: "Operations", reports: [
    { title: "Busy Hours", description: "Responsive appointment-density heatmap by day and hour", href: "/reports/busy-hours", icon: TimeIcon },
  ] },
];

export default function ReportsHome() { return <div className="space-y-8"><div><h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90 sm:text-3xl">Reports</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Financial, performance and operational insights from your shared business data.</p></div>{groups.map((group) => <section key={group.title}><h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group.title}</h2><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{group.reports.map((report) => { const Icon = report.icon; return <Link key={report.href} href={report.href} className="group flex min-h-32 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Icon className="size-6" /></span><span><span className="block font-semibold text-gray-800 group-hover:text-brand-600 dark:text-white/90">{report.title}</span><span className="mt-1 block text-sm leading-5 text-gray-500 dark:text-gray-400">{report.description}</span></span></Link>; })}</div></section>)}</div>; }
