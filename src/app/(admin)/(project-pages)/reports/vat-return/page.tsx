import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "VAT Return" };
export default function Page() { return <ReportPageClient kind="vat-return" />; }
