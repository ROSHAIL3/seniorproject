import type { Metadata } from "next";
import ServiceDetailsPageClient from "@/components/settings/services/ServiceDetailsPageClient";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getServiceById, getServiceCategories } from "@/services/services.service";
import { getTeamMembers } from "@/services/team-members.service";
export const metadata: Metadata = { title: "Service Details | Senior Project" };
export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) { const { serviceId } = await params; const id = decodeURIComponent(serviceId); const [service, categories, teamMembers, fields] = await Promise.all([getServiceById(id), getServiceCategories(true), getTeamMembers(), getServiceBookingFields(id)]); return <ServiceDetailsPageClient serviceId={id} initialService={service} initialCategories={categories} initialTeamMembers={teamMembers} initialFields={fields} />; }
