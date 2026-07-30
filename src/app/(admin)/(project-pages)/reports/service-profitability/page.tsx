import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Service Profitability" };
export default function Page() { return <ReportPageClient kind="service-profitability" />; }
