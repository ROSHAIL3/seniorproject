import type { Metadata } from "next";
import PackageFormPageClient from "@/components/settings/packages/PackageFormPageClient";
import { getBookableServices } from "@/services/services.service";
export const metadata: Metadata = { title: "New Package | Senior Project" };
export default async function Page() { return <PackageFormPageClient initialServices={(await getBookableServices()).filter((service) => service.kind === "service")} />; }
