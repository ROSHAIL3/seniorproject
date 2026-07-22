import type { Metadata } from "next";
import ReportPageClient from "@/components/reports/ReportPageClient";
export const metadata: Metadata = { title: "VAT Return | Senior Project" };
export default function Page() { return <ReportPageClient kind="vat-return" />; }
