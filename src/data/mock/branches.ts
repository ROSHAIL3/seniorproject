import type { BranchFormOptions } from "@/types/branches";

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
