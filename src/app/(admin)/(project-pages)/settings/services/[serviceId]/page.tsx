import type { Metadata } from "next";
import ServiceDetailsPageClient from "@/components/settings/services/ServiceDetailsPageClient";
import { getServiceBookingFields } from "@/services/service-booking-fields.service";
import { getCatalogFromDatabase } from "@/server/catalog.repository";
import { getTeamMembersFromDatabase } from "@/server/team-members.repository";
import { getBranchesFromDatabase } from "@/server/branches.repository";
export const metadata: Metadata = { title: "Service Details | Senior Project" };
export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) { const { serviceId } = await params; const id = decodeURIComponent(serviceId); const [catalog, teamMembers, branches, fields] = await Promise.all([getCatalogFromDatabase(), getTeamMembersFromDatabase(), getBranchesFromDatabase(), getServiceBookingFields(id)]); return <ServiceDetailsPageClient serviceId={id} initialService={catalog.services.find((service) => service.id === id) ?? null} initialCategories={catalog.categories} initialTeamMembers={teamMembers} initialBranches={branches} initialFields={fields} />; }
