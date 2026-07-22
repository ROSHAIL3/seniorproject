"use client";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import { getPackageById } from "@/services/packages.service";
import { getBookableServices } from "@/services/services.service";
import type { ServicePackage } from "@/types/packages";
import type { Service } from "@/types/services";
import PackageFormPageClient from "./PackageFormPageClient";
export default function PackageEditPageClient({ packageId, initialPackage, initialServices }: { packageId: string; initialPackage: ServicePackage | null; initialServices: Service[] }) { const [record, setRecord] = useState(initialPackage); const [services, setServices] = useState(initialServices); const [loading, setLoading] = useState(!initialPackage); useEffect(() => { queueMicrotask(() => { Promise.all([getPackageById(packageId), getBookableServices()]).then(([item, records]) => { setRecord(item); setServices(records.filter((service) => service.kind === "service")); }).finally(() => setLoading(false)); }); }, [packageId]); if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />; if (!record) return <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center"><h1 className="text-xl font-semibold text-gray-800">Package not found</h1><Button href="/settings/packages" size="sm" variant="outline" className="mt-5">Back to Packages</Button></div>; return <PackageFormPageClient packageRecord={record} initialServices={services} />; }
