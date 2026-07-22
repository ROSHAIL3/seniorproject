import type { StaffMember } from "@/types/staff";

export const mockStaffMembers: StaffMember[] = [
  { id: "staff-sophia", name: "Sophia Bennett", branchId: "branch-manama", serviceIds: ["service-haircut", "service-color"], workingDays: [0, 1, 2, 3, 4, 6], breaks: [{ startTime: "13:00", endTime: "13:30" }], isActive: true, createdAt: "2026-05-01T08:00:00.000Z" },
  { id: "staff-james", name: "James Carter", branchId: "branch-manama", serviceIds: ["service-massage"], workingDays: [0, 1, 3, 4, 5, 6], breaks: [{ startTime: "12:30", endTime: "13:15" }], isActive: true, createdAt: "2026-05-02T08:00:00.000Z" },
  { id: "staff-mia", name: "Mia Collins", branchId: "branch-seef", serviceIds: ["service-manicure"], workingDays: [0, 1, 2, 3, 4, 5], breaks: [{ startTime: "14:00", endTime: "14:30" }], isActive: true, createdAt: "2026-05-03T08:00:00.000Z" },
  { id: "staff-daniel", name: "Daniel Lee", branchId: "branch-manama", serviceIds: ["service-haircut"], workingDays: [0, 1, 2, 3, 4, 5], breaks: [{ startTime: "13:30", endTime: "14:00" }], isActive: true, createdAt: "2026-05-04T08:00:00.000Z" },
];
