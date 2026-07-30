import type { Metadata } from "next";
import PackagesPageClient from "@/components/settings/packages/PackagesPageClient";
import { getPackagesFromDatabase } from "@/server/catalog.repository";
export const metadata: Metadata = { title: "Service Packages" };
export default async function Page() { return <PackagesPageClient initialPackages={await getPackagesFromDatabase()} />; }
