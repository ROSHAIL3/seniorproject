import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Staff Performance" };
export default function Page() { return <ReportPageClient kind="staff-performance" />; }
