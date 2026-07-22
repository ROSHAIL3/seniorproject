import type { Metadata } from "next";
import ServiceFormPageClient from "@/components/settings/services/ServiceFormPageClient";
import { getServiceCategories } from "@/services/services.service";
export const metadata: Metadata = { title: "New Service | Senior Project" };
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const { category = "" } = await searchParams; return <ServiceFormPageClient initialCategories={await getServiceCategories()} initialCategoryId={category} />; }
