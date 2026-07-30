import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "Busy Hours" };
export default function Page() { return <ReportPageClient kind="busy-hours" />; }
