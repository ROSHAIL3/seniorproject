import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Staff Performance | Senior Project" };
export default function Page() { return <ReportPageClient kind="staff-performance" />; }
