import CatalogPageClient from "@/components/settings/services/CatalogPageClient";
import { getQuickAddCategories, getServiceCategories, getServices } from "@/services/services.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services | Senior Project",
};

export default async function Page() {
  const [initialServices, initialCategories, quickAddDefinitions] = await Promise.all([getServices(), getServiceCategories(), getQuickAddCategories()]);
  return <CatalogPageClient initialServices={initialServices} initialCategories={initialCategories} quickAddDefinitions={quickAddDefinitions} />;
}
