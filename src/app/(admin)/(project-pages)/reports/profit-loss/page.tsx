import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Profit and Loss" };
export default function Page() { return <ReportPageClient kind="profit-loss" />; }
