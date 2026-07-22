import type { Customer } from "@/types/customers";

export const mockCustomers: Customer[] = [
  {
    id: "customer-1",
    name: "Roshail tanvir",
    phone: "+973 3876 4976",
    email: "tfroshail@gmail.com",
    notes: "Prefers afternoon appointments and layered haircuts.",
    status: "Active",
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "customer-2",
    name: "Lena Hassan",
    phone: "+973 3601 8842",
    email: "lena.hassan@example.com",
    notes: "Contact by email for appointment confirmations.",
    status: "Active",
    createdAt: "2026-07-02T09:15:00.000Z",
    updatedAt: "2026-07-02T09:15:00.000Z",
  },
  {
    id: "customer-3",
    name: "Mariam Ali",
    phone: "+973 3994 1280",
    email: "mariam.ali@example.com",
    notes: "Regular massage customer.",
    status: "Active",
    createdAt: "2026-07-03T10:30:00.000Z",
    updatedAt: "2026-07-03T10:30:00.000Z",
  },
  {
    id: "customer-4",
    name: "Noor Salman",
    phone: "+973 3362 7701",
    email: "noor.salman@example.com",
    notes: "Prefers the Seef branch.",
    status: "Active",
    createdAt: "2026-07-04T11:45:00.000Z",
    updatedAt: "2026-07-04T11:45:00.000Z",
  },
];
