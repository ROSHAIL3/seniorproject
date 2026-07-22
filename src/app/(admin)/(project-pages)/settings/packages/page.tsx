import type { Metadata } from "next";
import PackagesPageClient from "@/components/settings/packages/PackagesPageClient";
import { getPackages } from "@/services/packages.service";
export const metadata: Metadata = { title: "Service Packages | Senior Project" };
export default async function Page() { return <PackagesPageClient initialPackages={await getPackages()} />; }
