import CatalogPageClient from "@/components/settings/services/CatalogPageClient";
import { getQuickAddCategories } from "@/services/services.service";
import { getServiceCategoriesFromDatabase, getServicesFromDatabase } from "@/server/catalog.repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
};

export default async function Page() {
  const [initialServices, initialCategories, quickAddDefinitions] = await Promise.all([getServicesFromDatabase(), getServiceCategoriesFromDatabase(), getQuickAddCategories()]);
  return <CatalogPageClient initialServices={initialServices} initialCategories={initialCategories} quickAddDefinitions={quickAddDefinitions} />;
}
