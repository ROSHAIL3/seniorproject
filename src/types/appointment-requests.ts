export type AppointmentRequestStatus = "Pending" | "Approved" | "Rejected";

export type AppointmentRequest = {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  branchName: string;
  submittedAt: string;
  status: AppointmentRequestStatus;
  rejectionReason: string;
  decidedAt: string;
  notes: string;
  priceBhd: number;
};
