import type { Metadata } from "next";
import PackageEditPageClient from "@/components/settings/packages/PackageEditPageClient";
import { getPackageById } from "@/services/packages.service";
import { getBookableServices } from "@/services/services.service";
export const metadata: Metadata = { title: "Edit Package | Senior Project" };
export default async function Page({ params }: { params: Promise<{ packageId: string }> }) { const { packageId } = await params; const id = decodeURIComponent(packageId); const [record, services] = await Promise.all([getPackageById(id), getBookableServices()]); return <PackageEditPageClient packageId={id} initialPackage={record} initialServices={services.filter((service) => service.kind === "service")} />; }
