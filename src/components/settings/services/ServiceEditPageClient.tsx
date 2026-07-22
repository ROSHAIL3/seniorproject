"use client";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import { getServiceById, getServiceCategories } from "@/services/services.service";
import type { Service, ServiceCategory } from "@/types/services";
import ServiceFormPageClient from "./ServiceFormPageClient";

export default function ServiceEditPageClient({ serviceId, initialService, initialCategories }: { serviceId: string; initialService: Service | null; initialCategories: ServiceCategory[] }) {
  const [service, setService] = useState(initialService); const [categories, setCategories] = useState(initialCategories); const [loading, setLoading] = useState(!initialService);
  useEffect(() => { queueMicrotask(() => { Promise.all([getServiceById(serviceId), getServiceCategories()]).then(([nextService, nextCategories]) => { setService(nextService); setCategories(nextCategories); }).finally(() => setLoading(false)); }); }, [serviceId]);
  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;
  if (!service) return <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center"><h1 className="text-xl font-semibold text-gray-800">Service not found</h1><Button href="/settings/services" size="sm" variant="outline" className="mt-5">Back to Catalog</Button></div>;
  return <ServiceFormPageClient service={service} initialCategories={categories} />;
}
