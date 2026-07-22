import { mockServices } from "@/data/mock/services";

const assignments = new Map(mockServices.map((service) => [service.id, new Set(service.staffIds)]));
export function getStaffIdsForService(serviceId: string) { return [...(assignments.get(serviceId) ?? new Set<string>())]; }
export function getServiceIdsForStaff(staffId: string) { return [...assignments.entries()].filter(([, staffIds]) => staffIds.has(staffId)).map(([serviceId]) => serviceId); }
export function setServiceStaff(serviceId: string, staffIds: string[]) { assignments.set(serviceId, new Set(staffIds)); }
export function setStaffServices(staffId: string, serviceIds: string[]) { const selected = new Set(serviceIds); assignments.forEach((staffIds, serviceId) => { if (selected.has(serviceId)) staffIds.add(staffId); else staffIds.delete(staffId); }); }
