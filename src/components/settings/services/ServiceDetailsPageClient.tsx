"use client";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button/Button";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getServiceById, getServiceCategories } from "@/services/services.service";
import { getTeamMembers } from "@/services/team-members.service";
import type { Service, ServiceBookingFieldDefinition, ServiceCategory } from "@/types/services";
import type { TeamMember } from "@/types/team-members";
import ServiceDetailsClient from "./ServiceDetailsClient";

export default function ServiceDetailsPageClient({ serviceId, initialService, initialCategories, initialTeamMembers, initialFields }: { serviceId: string; initialService: Service | null; initialCategories: ServiceCategory[]; initialTeamMembers: TeamMember[]; initialFields: ServiceBookingFieldDefinition[] }) {
  const [data, setData] = useState({ service: initialService, categories: initialCategories, teamMembers: initialTeamMembers, fields: initialFields }); const [loading, setLoading] = useState(!initialService);
  useEffect(() => { queueMicrotask(() => { Promise.all([getServiceById(serviceId), getServiceCategories(true), getTeamMembers(), getServiceBookingFields(serviceId)]).then(([service, categories, teamMembers, fields]) => setData({ service, categories, teamMembers, fields })).finally(() => setLoading(false)); }); }, [serviceId]);
  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;
  if (!data.service) return <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center"><h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Service not found</h1><Button href="/settings/services" size="sm" variant="outline" className="mt-5">Back to Catalog</Button></div>;
  return <ServiceDetailsClient initialService={data.service} categories={data.categories} teamMembers={data.teamMembers} initialFields={data.fields} />;
}
