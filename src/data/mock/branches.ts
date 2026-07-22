import type { Branch, BranchFormOptions } from "@/types/branches";

export const mockBranches: Branch[] = [
  {
    id: "branch-manama",
    name: "Lena Manama",
    code: "LEN-001",
    phone: "+973 3876 4976",
    email: "manama@lenabahrain.com",
    address: "Manama, Kingdom of Bahrain",
    googleMapsUrl: "https://maps.google.com/?q=Manama+Bahrain",
    timeZone: "Asia/Bahrain",
    status: "Active",
    isMain: true,
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-07-18T08:00:00.000Z",
  },
];

export const mockBranchFormOptions: BranchFormOptions = {
  timeZones: [
    { value: "Asia/Bahrain", label: "Asia/Bahrain (UTC+03:00)" },
    { value: "Asia/Riyadh", label: "Asia/Riyadh (UTC+03:00)" },
    { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
    { value: "Asia/Kuwait", label: "Asia/Kuwait (UTC+03:00)" },
    { value: "Asia/Qatar", label: "Asia/Qatar (UTC+03:00)" },
  ],
  statuses: [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ],
};
