import type { ActivityItem, Appointment } from "@/types/appointments";

const july24Customers = [
  {
    id: "customer-1",
    name: "Roshail Ahmed",
    phone: "+973 3876 4976",
    email: "tfroshail@gmail.com",
  },
  {
    id: "customer-2",
    name: "Lena Hassan",
    phone: "+973 3601 8842",
    email: "lena.hassan@example.com",
  },
  {
    id: "customer-3",
    name: "Mariam Ali",
    phone: "+973 3994 1280",
    email: "mariam.ali@example.com",
  },
  {
    id: "customer-4",
    name: "Noor Salman",
    phone: "+973 3362 7701",
    email: "noor.salman@example.com",
  },
];

const july24Statuses: Appointment["status"][] = [
  "Booked",
  "Confirmed",
  "Completed",
  "Booked",
  "Confirmed",
];

const addMinutes = (time: string, minutesToAdd: number) => {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
    totalMinutes % 60,
  ).padStart(2, "0")}`;
};

const july24StaffBookings = [
  {
    staffId: "staff-sophia",
    staffName: "Sophia Bennett",
    branchId: "branch-manama",
    serviceId: "service-haircut",
    serviceName: "Women's Haircut",
    priceBhd: 18,
    durationMinutes: 45,
    startTimes: [
      "08:00",
      "08:45",
      "09:30",
      "10:15",
      "11:00",
      "11:45",
      "12:30",
      "13:15",
      "14:00",
      "14:45",
    ],
  },
  {
    staffId: "staff-james",
    staffName: "James Carter",
    branchId: "branch-manama",
    serviceId: "service-massage",
    serviceName: "Deep Tissue Massage",
    priceBhd: 30,
    durationMinutes: 60,
    startTimes: [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ],
  },
  {
    staffId: "staff-mia",
    staffName: "Mia Collins",
    branchId: "branch-seef",
    serviceId: "service-manicure",
    serviceName: "Classic Manicure",
    priceBhd: 15,
    durationMinutes: 45,
    startTimes: [
      "08:00",
      "08:45",
      "09:30",
      "10:15",
      "11:00",
      "11:45",
      "12:30",
      "13:15",
      "14:00",
      "14:45",
    ],
  },
  {
    // Daniel already has the 12:00 booking in the original mock records below.
    staffId: "staff-daniel",
    staffName: "Daniel Lee",
    branchId: "branch-manama",
    serviceId: "service-haircut",
    serviceName: "Women's Haircut",
    priceBhd: 18,
    durationMinutes: 45,
    startTimes: [
      "08:00",
      "08:45",
      "09:30",
      "10:15",
      "11:00",
      "12:45",
      "14:00",
      "14:45",
      "15:30",
    ],
  },
];

const july24MockAppointments: Appointment[] = july24StaffBookings.flatMap(
  (staff, staffIndex) =>
    staff.startTimes.map((startTime, bookingIndex) => {
      const customer =
        july24Customers[(staffIndex + bookingIndex) % july24Customers.length];
      const sequence = staffIndex * 10 + bookingIndex + 1;

      return {
        id: `mock-july24-${staff.staffId}-${bookingIndex + 1}`,
        bookingNumber: `BK-MOCK-0724-${String(sequence).padStart(2, "0")}`,
        appointmentDate: "2026-07-24",
        startTime,
        endTime: addMinutes(startTime, staff.durationMinutes),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        staffId: staff.staffId,
        staffName: staff.staffName,
        serviceId: staff.serviceId,
        serviceName: staff.serviceName,
        priceBhd: staff.priceBhd,
        status: july24Statuses[bookingIndex % july24Statuses.length],
        createdBy: "Mock calendar data",
        branchId: staff.branchId,
        advancePaidBhd: 0,
        createdAt: "2026-07-23T08:00:00.000Z",
        updatedAt: "2026-07-23T08:00:00.000Z",
      };
    }),
);

export const mockAppointments: Appointment[] = [
  { id: "appointment-1", bookingNumber: "BK-000004", appointmentDate: "2026-07-20", startTime: "10:45", endTime: "11:30", customerId: "customer-1", customerName: "Roshail Ahmed", customerPhone: "+973 3876 4976", customerEmail: "tfroshail@gmail.com", staffId: "staff-sophia", staffName: "Sophia Bennett", serviceId: "service-haircut", serviceName: "Women's Haircut", priceBhd: 18, status: "Booked", createdBy: "Online booking", branchId: "branch-manama", notes: "Customer requested a layered finish.", advancePaidBhd: 5, createdAt: "2026-07-18T06:12:00.000Z", updatedAt: "2026-07-18T06:18:00.000Z" },
  { id: "appointment-2", bookingNumber: "BK-000005", appointmentDate: "2026-07-20", startTime: "11:30", endTime: "12:15", customerId: "customer-2", customerName: "Lena Hassan", customerPhone: "+973 3601 8842", customerEmail: "lena.hassan@example.com", staffId: "staff-sophia", staffName: "Sophia Bennett", serviceId: "service-haircut", serviceName: "Women's Haircut", priceBhd: 18, status: "Confirmed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 0, createdAt: "2026-07-18T07:00:00.000Z", updatedAt: "2026-07-18T07:00:00.000Z" },
  { id: "appointment-3", bookingNumber: "BK-000006", appointmentDate: "2026-07-21", startTime: "09:30", endTime: "10:30", customerId: "customer-3", customerName: "Mariam Ali", customerPhone: "+973 3994 1280", customerEmail: "mariam.ali@example.com", staffId: "staff-james", staffName: "James Carter", serviceId: "service-massage", serviceName: "Deep Tissue Massage", priceBhd: 30, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 30, createdAt: "2026-07-18T07:30:00.000Z", updatedAt: "2026-07-21T07:30:00.000Z" },
  { id: "appointment-4", bookingNumber: "BK-000007", appointmentDate: "2026-07-22", startTime: "14:30", endTime: "15:15", customerId: "customer-4", customerName: "Noor Salman", customerPhone: "+973 3362 7701", customerEmail: "noor.salman@example.com", staffId: "staff-mia", staffName: "Mia Collins", serviceId: "service-manicure", serviceName: "Classic Manicure", priceBhd: 15, status: "Cancelled", createdBy: "Noor Reception", branchId: "branch-seef", advancePaidBhd: 0, createdAt: "2026-07-18T08:00:00.000Z", updatedAt: "2026-07-19T08:00:00.000Z" },
  { id: "appointment-5", bookingNumber: "BK-000008", appointmentDate: "2026-07-23", startTime: "16:00", endTime: "17:30", customerId: "customer-2", customerName: "Lena Hassan", customerPhone: "+973 3601 8842", customerEmail: "lena.hassan@example.com", staffId: "staff-sophia", staffName: "Sophia Bennett", serviceId: "service-color", serviceName: "Hair Color & Treatment", priceBhd: 42.5, status: "No Show", createdBy: "Online booking", branchId: "branch-manama", advancePaidBhd: 10, createdAt: "2026-07-18T08:30:00.000Z", updatedAt: "2026-07-23T14:00:00.000Z" },
  { id: "appointment-6", bookingNumber: "BK-000009", appointmentDate: "2026-07-24", startTime: "12:00", endTime: "12:45", customerId: "customer-3", customerName: "Mariam Ali", customerPhone: "+973 3994 1280", customerEmail: "mariam.ali@example.com", staffId: "staff-daniel", staffName: "Daniel Lee", serviceId: "service-haircut", serviceName: "Women's Haircut", priceBhd: 18, status: "Confirmed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 0, createdAt: "2026-07-18T09:00:00.000Z", updatedAt: "2026-07-18T09:00:00.000Z" },
  { id: "appointment-7", bookingNumber: "BK-000010", appointmentDate: "2026-07-02", startTime: "10:00", endTime: "10:45", customerId: "customer-1", customerName: "Roshail Ahmed", customerPhone: "+973 3876 4976", customerEmail: "tfroshail@gmail.com", staffId: "staff-sophia", staffName: "Sophia Bennett", serviceId: "service-haircut", serviceName: "Women's Haircut", priceBhd: 18, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 19.8, createdAt: "2026-07-02T07:00:00.000Z", updatedAt: "2026-07-02T07:45:00.000Z" },
  { id: "appointment-8", bookingNumber: "BK-000011", appointmentDate: "2026-07-05", startTime: "11:00", endTime: "12:00", customerId: "customer-3", customerName: "Mariam Ali", customerPhone: "+973 3994 1280", customerEmail: "mariam.ali@example.com", staffId: "staff-james", staffName: "James Carter", serviceId: "service-massage", serviceName: "Deep Tissue Massage", priceBhd: 30, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 33, createdAt: "2026-07-05T08:00:00.000Z", updatedAt: "2026-07-05T09:00:00.000Z" },
  { id: "appointment-9", bookingNumber: "BK-000012", appointmentDate: "2026-07-08", startTime: "13:00", endTime: "13:45", customerId: "customer-4", customerName: "Noor Salman", customerPhone: "+973 3362 7701", customerEmail: "noor.salman@example.com", staffId: "staff-mia", staffName: "Mia Collins", serviceId: "service-manicure", serviceName: "Classic Manicure", priceBhd: 15, status: "Completed", createdBy: "Noor Reception", branchId: "branch-seef", advancePaidBhd: 16.5, createdAt: "2026-07-08T10:00:00.000Z", updatedAt: "2026-07-08T10:45:00.000Z" },
  { id: "appointment-10", bookingNumber: "BK-000013", appointmentDate: "2026-07-11", startTime: "14:00", endTime: "15:30", customerId: "customer-2", customerName: "Lena Hassan", customerPhone: "+973 3601 8842", customerEmail: "lena.hassan@example.com", staffId: "staff-sophia", staffName: "Sophia Bennett", serviceId: "service-color", serviceName: "Hair Color & Treatment", priceBhd: 42.5, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 46.75, createdAt: "2026-07-11T11:00:00.000Z", updatedAt: "2026-07-11T12:30:00.000Z" },
  { id: "appointment-11", bookingNumber: "BK-000014", appointmentDate: "2026-07-14", startTime: "09:30", endTime: "10:15", customerId: "customer-1", customerName: "Roshail Ahmed", customerPhone: "+973 3876 4976", customerEmail: "tfroshail@gmail.com", staffId: "staff-daniel", staffName: "Daniel Lee", serviceId: "service-haircut", serviceName: "Women's Haircut", priceBhd: 18, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 19.8, createdAt: "2026-07-14T06:30:00.000Z", updatedAt: "2026-07-14T07:15:00.000Z" },
  { id: "appointment-12", bookingNumber: "BK-000015", appointmentDate: "2026-07-17", startTime: "15:00", endTime: "16:00", customerId: "customer-3", customerName: "Mariam Ali", customerPhone: "+973 3994 1280", customerEmail: "mariam.ali@example.com", staffId: "staff-james", staffName: "James Carter", serviceId: "service-massage", serviceName: "Deep Tissue Massage", priceBhd: 30, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 33, createdAt: "2026-07-17T12:00:00.000Z", updatedAt: "2026-07-17T13:00:00.000Z" },
  { id: "appointment-13", bookingNumber: "BK-000016", appointmentDate: "2026-07-19", startTime: "10:30", endTime: "11:15", customerId: "customer-4", customerName: "Noor Salman", customerPhone: "+973 3362 7701", customerEmail: "noor.salman@example.com", staffId: "staff-mia", staffName: "Mia Collins", serviceId: "service-manicure", serviceName: "Classic Manicure", priceBhd: 15, status: "Completed", createdBy: "Noor Reception", branchId: "branch-seef", advancePaidBhd: 16.5, createdAt: "2026-07-19T07:30:00.000Z", updatedAt: "2026-07-19T08:15:00.000Z" },
  { id: "appointment-14", bookingNumber: "BK-000017", appointmentDate: "2026-07-20", startTime: "16:00", endTime: "17:30", customerId: "customer-2", customerName: "Lena Hassan", customerPhone: "+973 3601 8842", customerEmail: "lena.hassan@example.com", staffId: "staff-sophia", staffName: "Sophia Bennett", serviceId: "service-color", serviceName: "Hair Color & Treatment", priceBhd: 42.5, status: "Completed", createdBy: "Fatima Admin", branchId: "branch-manama", advancePaidBhd: 46.75, createdAt: "2026-07-20T13:00:00.000Z", updatedAt: "2026-07-20T14:30:00.000Z" },
  ...july24MockAppointments,
];

export const mockAppointmentActivity: ActivityItem[] = [
  { id: "activity-1", appointmentId: "appointment-1", title: "Appointment booked", detail: "Created through online booking by Roshail Ahmed.", occurredAt: "2026-07-18T06:12:00.000Z" },
  { id: "activity-2", appointmentId: "appointment-1", title: "Advance payment received", detail: "5.000 BHD recorded by Fatima Admin.", occurredAt: "2026-07-18T06:18:00.000Z" },
];
