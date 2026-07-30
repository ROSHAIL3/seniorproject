import type { Metadata } from "next";
import ServiceEditPageClient from "@/components/settings/services/ServiceEditPageClient";
import { getCatalogFromDatabase } from "@/server/catalog.repository";
export const metadata: Metadata = { title: "Edit Service" };
export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) { const { serviceId } = await params; const id = decodeURIComponent(serviceId); const catalog = await getCatalogFromDatabase(); return <ServiceEditPageClient serviceId={id} initialService={catalog.services.find((service) => service.id === id) ?? null} initialCategories={catalog.categories.filter((category) => category.status === "Active")} />; }
