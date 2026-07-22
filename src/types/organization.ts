export type OrganizationLogo = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

export type OrganizationDetails = {
  name: string;
  businessEmail: string;
  emailVerified: boolean;
  businessPhone: string;
  country: string;
  currency: string;
  timeZone: string;
  address: string;
  website: string;
  logo?: OrganizationLogo;
};

export type PublicBookingSettings = {
  slug: string;
  enabled: boolean;
  baseUrl: string;
};

export type OrganizationStorageUsage = {
  usedBytes: number;
  limitBytes: number;
  uploadedFileCount: number;
};

export type Organization = {
  id: string;
  details: OrganizationDetails;
  publicBooking: PublicBookingSettings;
  storage: OrganizationStorageUsage;
  status: "Active" | "Deleted";
  createdAt: string;
  updatedAt: string;
};

export type OrganizationProfileOptions = {
  countries: { value: string; label: string }[];
  currencies: { value: string; label: string }[];
  timeZones: { value: string; label: string }[];
};
