import type { BranchFormOptions } from "@/types/branches";
import type { OrganizationProfileOptions } from "@/types/organization";

const timeZones = [
  { value: "Asia/Bahrain", label: "Asia/Bahrain (UTC+03:00)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Kuwait", label: "Asia/Kuwait (UTC+03:00)" },
  { value: "Asia/Qatar", label: "Asia/Qatar (UTC+03:00)" },
];

export const BRANCH_FORM_OPTIONS: BranchFormOptions = {
  timeZones,
  statuses: [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ],
};

export const ORGANIZATION_PROFILE_OPTIONS: OrganizationProfileOptions = {
  countries: [
    { value: "BH", label: "Bahrain" },
    { value: "SA", label: "Saudi Arabia" },
    { value: "AE", label: "United Arab Emirates" },
    { value: "KW", label: "Kuwait" },
    { value: "QA", label: "Qatar" },
  ],
  currencies: [
    { value: "BHD", label: "BHD — Bahraini Dinar" },
    { value: "SAR", label: "SAR — Saudi Riyal" },
    { value: "AED", label: "AED — UAE Dirham" },
    { value: "USD", label: "USD — US Dollar" },
  ],
  timeZones,
};
