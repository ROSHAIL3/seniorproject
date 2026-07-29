import type { Metadata } from "next";
import PackageFormPageClient from "@/components/settings/packages/PackageFormPageClient";
import { getServicesFromDatabase } from "@/server/catalog.repository";
export const metadata: Metadata = { title: "New Package | Senior Project" };
export default async function Page() { return <PackageFormPageClient initialServices={(await getServicesFromDatabase()).filter((service) => service.kind === "service" && service.isActive)} />; }
