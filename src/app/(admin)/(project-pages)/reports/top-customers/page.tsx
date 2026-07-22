import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Top Customers | Senior Project" };
export default function Page() { return <ReportPageClient kind="top-customers" />; }
