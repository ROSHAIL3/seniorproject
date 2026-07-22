import type { Organization, OrganizationProfileOptions } from "@/types/organization";

export const mockOrganization: Organization = {
  id: "organization-saloon-bahrain",
  details: {
    name: "saloon Bahrain",
    businessEmail: "hello@saloonbahrain.com",
    emailVerified: false,
    businessPhone: "+973 3876 4976",
    country: "BH",
    currency: "BHD",
    timeZone: "Asia/Bahrain",
    address: "Manama, Bahrain",
    website: "https://saloonbahrain.com",
  },
  publicBooking: {
    slug: "saloon-bahrain",
    enabled: true,
    baseUrl: "https://getsaloon.ai/book",
  },
  storage: {
    usedBytes: 18_874_368,
    limitBytes: 838_860_800,
    uploadedFileCount: 14,
  },
  status: "Active",
  createdAt: "2026-05-01T08:00:00.000Z",
  updatedAt: "2026-07-18T08:00:00.000Z",
};

export const mockOrganizationProfileOptions: OrganizationProfileOptions = {
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
  timeZones: [
    { value: "Asia/Bahrain", label: "Asia/Bahrain (UTC+03:00)" },
    { value: "Asia/Riyadh", label: "Asia/Riyadh (UTC+03:00)" },
    { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
    { value: "Asia/Kuwait", label: "Asia/Kuwait (UTC+03:00)" },
    { value: "Asia/Qatar", label: "Asia/Qatar (UTC+03:00)" },
  ],
};
