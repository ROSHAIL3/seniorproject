import type { Metadata } from "next";
import PackageEditPageClient from "@/components/settings/packages/PackageEditPageClient";
import { getCatalogFromDatabase } from "@/server/catalog.repository";
export const metadata: Metadata = { title: "Edit Package | Senior Project" };
export default async function Page({ params }: { params: Promise<{ packageId: string }> }) { const { packageId } = await params; const id = decodeURIComponent(packageId); const catalog = await getCatalogFromDatabase(); return <PackageEditPageClient packageId={id} initialPackage={catalog.packages.find((item) => item.id === id) ?? null} initialServices={catalog.services.filter((service) => service.kind === "service" && service.isActive)} />; }
