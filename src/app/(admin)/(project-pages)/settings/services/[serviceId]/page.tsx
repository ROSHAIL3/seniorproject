import type { Metadata } from "next";
import ServiceDetailsPageClient from "@/components/settings/services/ServiceDetailsPageClient";
import { getCatalogFromDatabase } from "@/server/catalog.repository";
import { getTeamMembersFromDatabase } from "@/server/team-members.repository";
import { getBranchesFromDatabase } from "@/server/branches.repository";
import { getServiceBookingFieldsFromDatabase } from "@/server/field-definitions.repository";
export const metadata: Metadata = { title: "Service Details | Senior Project" };
export default async function Page({ params }: { params: Promise<{ serviceId: string }> }) { const { serviceId } = await params; const id = decodeURIComponent(serviceId); const [catalog, teamMembers, branches, fields] = await Promise.all([getCatalogFromDatabase(), getTeamMembersFromDatabase(), getBranchesFromDatabase(), getServiceBookingFieldsFromDatabase(id)]); return <ServiceDetailsPageClient serviceId={id} initialService={catalog.services.find((service) => service.id === id) ?? null} initialCategories={catalog.categories} initialTeamMembers={teamMembers} initialBranches={branches} initialFields={fields} />; }
