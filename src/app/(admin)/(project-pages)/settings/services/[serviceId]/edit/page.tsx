import type { Metadata } from "next";
import ServiceEditPageClient from "@/components/settings/services/ServiceEditPageClient";
import { getServiceById, getServiceCategories } from "@/services/services.service";
export const metadata: Metadata = { title: "Edit Service | Senior Project" };
export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) { const { serviceId } = await params; const id = decodeURIComponent(serviceId); const [service, categories] = await Promise.all([getServiceById(id), getServiceCategories()]); return <ServiceEditPageClient serviceId={id} initialService={service} initialCategories={categories} />; }
