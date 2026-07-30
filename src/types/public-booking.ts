export type PublicBookingOrganization = {
  name: string;
  slug: string;
  address: string;
  businessPhone: string;
  website: string;
  currencyCode: string;
  timeZone: string;
  logoObjectPath: string | null;
  logoUrl?: string;
  allowSameDayBookings: boolean;
  autoConfirmAppointments: boolean;
};

export type PublicBookingBranch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
};

export type PublicBookingCategory = {
  id: string;
  name: string;
};

export type PublicBookingService = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceBhd: number;
  branchIds: string[];
};

export type PublicBookingField = {
  id: string;
  serviceId: string;
  label: string;
  type: "text" | "number" | "date" | "checkbox" | "dropdown";
  required: boolean;
  sortOrder: number;
  options: { id: string; label: string }[];
};

export type PublicBookingPageData = {
  organization: PublicBookingOrganization;
  branches: PublicBookingBranch[];
  categories: PublicBookingCategory[];
  services: PublicBookingService[];
  serviceFields: PublicBookingField[];
};

export type PublicBookingSlot = {
  staffKey: string;
  staffName: string;
  startAt: string;
  endAt: string;
};

export type PublicBookingConfirmation = {
  bookingNumber: string;
  organizationName: string;
  serviceName: string;
  staffName: string;
  branchName: string;
  startsAt: string;
  endsAt: string;
  status: "booked" | "confirmed";
  timeZone: string;
  accessCode: string;
};

export type PublicBookingCreateInput = {
  branchId: string;
  serviceId: string;
  staffKey: string;
  startAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes: string;
  serviceFieldValues: Record<string, string | boolean>;
  submissionId: string;
};

export type CustomerBookingScope = "upcoming" | "history" | "cancelled";

export type CustomerBookingItem = {
  id: string;
  bookingNumber: string;
  serviceId: string | null;
  serviceName: string;
  branchId: string;
  branchName: string;
  staffName: string;
  startsAt: string;
  endsAt: string;
  status: "booked" | "confirmed" | "completed" | "cancelled" | "no_show";
  priceBhd: number;
  canCancel: boolean;
  canReschedule: boolean;
  refundReviewRequired: boolean;
  pendingReschedule: {
    id: string;
    startsAt: string;
    endsAt: string;
    staffName: string;
  } | null;
};

export type CustomerBookingPage = {
  items: CustomerBookingItem[];
  nextCursor: { startsAt: string; id: string } | null;
};

export type CustomerBookingSession = {
  organizationId: string;
  customerId: string;
  expiresAt: number;
};

export type PendingBookingCounts = {
  publicBookings: number;
  reschedules: number;
};
