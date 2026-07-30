import type { Metadata } from "next";
import ServiceFormPageClient from "@/components/settings/services/ServiceFormPageClient";
import { getServiceCategoriesFromDatabase } from "@/server/catalog.repository";
export const metadata: Metadata = { title: "New Service" };
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) { const { category = "" } = await searchParams; return <ServiceFormPageClient initialCategories={await getServiceCategoriesFromDatabase()} initialCategoryId={category} />; }
