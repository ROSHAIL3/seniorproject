import ReportsHome from "@/components/reports/ReportsHome";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
};

export default function Page() { return <ReportsHome />; }
