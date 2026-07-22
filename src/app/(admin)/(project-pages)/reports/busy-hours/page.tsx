import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Busy Hours | Senior Project" };
export default function Page() { return <ReportPageClient kind="busy-hours" />; }
