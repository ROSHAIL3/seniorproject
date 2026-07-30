export type AppointmentStatus =
  | "Booked"
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "No Show";

export type DateFilter = "upcoming" | "today" | "week" | "month" | "all";

export type Appointment = {
  id: string;
  bookingNumber: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  packageId?: string;
  packageType?: import("./packages").PackageType;
  priceBhd: number;
  status: AppointmentStatus;
  createdBy: string;
  branchId: string;
  notes?: string;
  advancePaidBhd: number;
  createdAt: string;
  updatedAt: string;
  bookingSource?: "admin" | "public";
  pendingRequestState?: "pending" | "approved" | "rejected" | "withdrawn";
  financialFollowUpRequired?: boolean;
};

export type AppointmentRescheduleRequestView = {
  id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  proposedStartsAt: string;
  proposedEndsAt: string;
  proposedStaffName: string;
  requestedAt: string;
  rejectionReason: string;
};

export type BookingFormData = {
  customerId: string;
  serviceId: string;
  staffId: string;
  branchId: string;
  appointmentDate: string;
  startTime: string;
};

export type AppointmentCreateInput = BookingFormData & {
  endTime: string;
  status: AppointmentStatus;
  createdBy: string;
  notes?: string;
  serviceFieldValues?: import("./services").ServiceBookingFieldValueMap;
};

export type BookingValidationError = {
  code:
    | "missing-customer"
    | "missing-service"
    | "missing-staff"
    | "missing-date-time"
    | "past"
    | "business-hours"
    | "staff-break"
    | "staff-day-off"
    | "staff-hours"
    | "service-duration"
    | "staff-service"
    | "branch-conflict"
    | "staff-conflict"
    | "customer-conflict"
    | "overlap";
  message: string;
};

export type ActivityItem = {
  id: string;
  appointmentId: string;
  title: string;
  detail: string;
  occurredAt: string;
};
